import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const generateSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

/**
 * Generates a payroll period: one Payslip per active staff member with a
 * salary on file, snapshotting baseSalary and pulling in:
 *
 *  1. Any RESOLVED StaffQuery.deductionAmount not yet claimed by a prior
 *     payslip — claimed here (payslipId set) so the same disciplinary
 *     deduction can never be applied twice. Any category, not just
 *     lateness — misconduct, policy violation, performance, etc.
 *  2. Any ad-hoc StaffDeduction not yet claimed, same claim-once rule.
 *
 * Lateness/absence are computed and shown (lateCount/absenceCount) purely
 * as context — they do NOT feed into netPay. If a late or absent day
 * should cost someone pay, that's a decision HR makes explicitly by
 * issuing a query or an ad-hoc deduction on the staff profile; payroll
 * generation itself never invents a monetary deduction from attendance.
 *
 * This does not move money anywhere — no bank transfer, no payment API —
 * it computes what should be paid and records it for HR/finance to action
 * manually via the bank details already on the Staff record.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "payroll:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { month, year } = parsed.data;

  const existing = await prisma.payrollPeriod.findUnique({ where: { month_year: { month, year } } });
  if (existing) {
    return NextResponse.json({ message: "A payroll period for this month already exists." }, { status: 409 });
  }

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1); // exclusive
  const daysInMonth = new Date(year, month, 0).getDate();

  const staffList = await prisma.staff.findMany({
    where: { active: true, currentSalary: { not: null } },
    include: { shiftAssignments: { include: { shiftType: true } } },
  });

  if (staffList.length === 0) {
    return NextResponse.json(
      { message: "No active staff have a salary on file yet — nothing to generate." },
      { status: 422 },
    );
  }

  const period = await prisma.$transaction(async (tx) => {
    const createdPeriod = await tx.payrollPeriod.create({
      data: { month, year, generatedBy: session.user.id },
    });

    for (const staff of staffList) {
      const attendanceThisMonth = await tx.attendance.findMany({
        where: { staffId: staff.id, timestamp: { gte: periodStart, lt: periodEnd } },
        select: { timestamp: true, type: true, status: true },
      });

      const lateCount = attendanceThisMonth.filter((a) => a.type === "CHECK_IN" && a.status === "LATE").length;

      // Absence: days this month the staff was scheduled to work (per an
      // active ShiftAssignment covering that day) but has no CHECK_IN at
      // all. Days with no shift assignment aren't counted as absences —
      // there's nothing to be absent from. Informational only — see the
      // function comment for why this never turns into a deduction here.
      const checkedInDays = new Set(
        attendanceThisMonth.filter((a) => a.type === "CHECK_IN").map((a) => new Date(a.timestamp).getDate()),
      );
      let absenceCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const scheduled = staff.shiftAssignments.some(
          (sa) =>
            sa.daysOfWeek.includes(dayOfWeek) &&
            sa.effectiveFrom <= date &&
            (!sa.effectiveTo || sa.effectiveTo >= date),
        );
        if (scheduled && !checkedInDays.has(day) && date < new Date()) {
          absenceCount += 1;
        }
      }

      const unclaimedQueries = await tx.staffQuery.findMany({
        where: { staffId: staff.id, status: "RESOLVED", payslipId: null, deductionAmount: { not: null } },
      });
      const queryDeductions = unclaimedQueries.reduce((sum, q) => sum + Number(q.deductionAmount ?? 0), 0);
      const queryDeductionNote =
        unclaimedQueries.length > 0
          ? unclaimedQueries.map((q) => `${q.category}: ${q.subject}`).join("; ")
          : undefined;

      const unclaimedManualDeductions = await tx.staffDeduction.findMany({
        where: { staffId: staff.id, payslipId: null },
      });
      const otherDeductions = unclaimedManualDeductions.reduce((sum, d) => sum + Number(d.amount), 0);
      const otherDeductionNote =
        unclaimedManualDeductions.length > 0
          ? unclaimedManualDeductions.map((d) => d.reason).join("; ")
          : undefined;

      const baseSalary = Number(staff.currentSalary);
      const netPay = Math.max(0, baseSalary - queryDeductions - otherDeductions);

      const payslip = await tx.payslip.create({
        data: {
          periodId: createdPeriod.id,
          staffId: staff.id,
          baseSalary,
          lateCount,
          absenceCount,
          queryDeductions,
          queryDeductionNote,
          otherDeductions,
          otherDeductionNote,
          netPay,
        },
      });

      if (unclaimedQueries.length > 0) {
        await tx.staffQuery.updateMany({
          where: { id: { in: unclaimedQueries.map((q) => q.id) } },
          data: { payslipId: payslip.id },
        });
      }
      if (unclaimedManualDeductions.length > 0) {
        await tx.staffDeduction.updateMany({
          where: { id: { in: unclaimedManualDeductions.map((d) => d.id) } },
          data: { payslipId: payslip.id },
        });
      }
    }

    return createdPeriod;
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "PAYROLL_GENERATED",
    targetType: "PayrollPeriod",
    targetId: period.id,
    details: { month, year, staffCount: staffList.length },
  });

  return NextResponse.json(period, { status: 201 });
}
