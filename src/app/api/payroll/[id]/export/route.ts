import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { buildXlsxBuffer } from "@/lib/xlsx-report";
import { toCsvRow } from "@/lib/csv";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "payroll:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: { payslips: { include: { staff: true }, orderBy: { staff: { fullName: "asc" } } } },
  });
  if (!period) return NextResponse.json({ message: "Payroll period not found" }, { status: 404 });

  const monthLabel = `${MONTHS[period.month - 1]} ${period.year}`;
  const rows = period.payslips.map((p) => ({
    "Staff code": p.staff.staffCode,
    "Full name": p.staff.fullName,
    "Bank name": p.staff.bankName ?? "",
    "Account name": p.staff.bankAccountName ?? "",
    "Account number": p.staff.bankAccountNumber ?? "",
    "Base salary": Number(p.baseSalary),
    "Query deductions": Number(p.queryDeductions),
    "Query deduction note": p.queryDeductionNote ?? "",
    "Other deductions": Number(p.otherDeductions),
    "Other deduction note": p.otherDeductionNote ?? "",
    "Net pay": Number(p.netPay),
    "Late days (info only)": p.lateCount,
    "Absent days (info only)": p.absenceCount,
  }));

  if (format === "csv") {
    const header = Object.keys(rows[0] ?? {});
    const csvLines = [toCsvRow(header), ...rows.map((row) => toCsvRow(Object.values(row)))];
    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payroll-${monthLabel}.csv"`,
      },
    });
  }

  const buffer = buildXlsxBuffer(monthLabel, rows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payroll-${monthLabel}.xlsx"`,
    },
  });
}
