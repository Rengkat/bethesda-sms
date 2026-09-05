import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayrollPeriodActions } from "@/components/payroll/payroll-period-actions";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Payroll period" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PayrollPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!role || !can(role as never, "payroll:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payroll period" description="Restricted to Super Admin and HR Admin." />
      </div>
    );
  }

  const period = await prisma.payrollPeriod
    .findUnique({
      where: { id },
      include: { payslips: { include: { staff: true }, orderBy: { staff: { fullName: "asc" } } } },
    })
    .catch(() => null);

  if (!period) notFound();

  const totalNet = period.payslips.reduce((sum, p) => sum + Number(p.netPay), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${MONTHS[period.month - 1]} ${period.year} payroll`}
        description={`${period.payslips.length} staff · Total net pay ${formatNaira(totalNet)}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={period.status === "PAID" ? "success" : period.status === "FINALIZED" ? "brand" : "neutral"}>
              {period.status}
            </Badge>
            <PayrollPeriodActions periodId={period.id} status={period.status} />
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Payslips for this period</caption>
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Staff</th>
                <th scope="col" className="px-5 py-3 font-medium">Base salary</th>
                <th scope="col" className="px-5 py-3 font-medium">Late / Absent</th>
                <th scope="col" className="px-5 py-3 font-medium">Attendance ded.</th>
                <th scope="col" className="px-5 py-3 font-medium">Query ded.</th>
                <th scope="col" className="px-5 py-3 font-medium">Net pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {period.payslips.map((p) => (
                <tr key={p.id} className="hover:bg-brand-blue-light/40">
                  <td className="px-5 py-3 font-medium text-foreground">{p.staff.fullName}</td>
                  <td className="px-5 py-3 text-muted">{formatNaira(p.baseSalary)}</td>
                  <td className="px-5 py-3 text-muted">
                    {p.lateCount} / {p.absenceCount}
                  </td>
                  <td className="px-5 py-3 text-muted">{formatNaira(p.attendanceDeduction)}</td>
                  <td className="px-5 py-3 text-muted">{formatNaira(p.queryDeductions)}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{formatNaira(p.netPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-muted">
        This computes what should be paid — it doesn&apos;t move money. Use the bank details on
        each staff profile to action payment, then mark this period as paid once done.
      </p>
    </div>
  );
}
