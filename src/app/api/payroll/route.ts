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
  lateDeductionPerOccurrence: z.coerce.number().min(0).default(0),
  absenceDeductionPerOccurrence: z.coerce.number().min(0).default(0),
});

/**
 * Generates a payroll period: one Payslip per active staff member with a
 * salary on file, snapshotting baseSalary and computing deductions from:
 *
 *  1. Attendance that month — lateCount × lateDeductionPerOccurrence, plus
 *     absenceCount (scheduled days with no check-in at all, per their
 *     shift assignment) × absenceDeductionPerOccurrence. Both rates are
 *     set per-run, not globally, so a past period's numbers don't shift
 *     if the org's policy changes later.
 *  2. Any RESOLVED StaffQuery.deductionAmount not yet claimed by a prior
 *     payslip — claimed here (payslipId set) so the same disciplinary
 *     deduction can never be applied twice.
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
  const { month, year, lateDeductionPerOccurrence, absenceDeductionPerOccurrence } = parsed.data;

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
      data: {
        month,
        year,
        lateDeductionPerOccurrence,
        absenceDeductionPerOccurrence,
        generatedBy: session.user.id,
      },
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
      // there's nothing to be absent from.
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

      const attendanceDeduction =
        lateCount * lateDeductionPerOccurrence + absenceCount * absenceDeductionPerOccurrence;

      const unclaimedQueries = await tx.staffQuery.findMany({
        where: { staffId: staff.id, status: "RESOLVED", payslipId: null, deductionAmount: { not: null } },
      });
      const queryDeductions = unclaimedQueries.reduce((sum, q) => sum + Number(q.deductionAmount ?? 0), 0);

      const baseSalary = Number(staff.currentSalary);
      const netPay = Math.max(0, baseSalary - attendanceDeduction - queryDeductions);

      const payslip = await tx.payslip.create({
        data: {
          periodId: createdPeriod.id,
          staffId: staff.id,
          baseSalary,
          lateCount,
          absenceCount,
          attendanceDeduction,
          queryDeductions,
          netPay,
        },
      });

      if (unclaimedQueries.length > 0) {
        await tx.staffQuery.updateMany({
          where: { id: { in: unclaimedQueries.map((q) => q.id) } },
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
