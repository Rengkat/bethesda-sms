import Link from "next/link";
import { headers } from "next/headers";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayrollGenerateButton } from "@/components/payroll/payroll-generate-button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Payroll" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PayrollPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!role || !can(role as never, "payroll:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Payroll" description="Monthly salary runs and payslips." />
        <Card>
          <div className="p-6 text-sm text-muted">
            Payroll is restricted to Super Admin and HR Admin.
          </div>
        </Card>
      </div>
    );
  }

  const periods = await prisma.payrollPeriod
    .findMany({
      include: { payslips: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Monthly salary runs and payslips."
        actions={<PayrollGenerateButton />}
      />

      <Card className="overflow-hidden">
        {periods.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payroll periods yet"
            description="Generate your first payroll run to snapshot salaries and compute deductions."
            action={<PayrollGenerateButton />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Payroll periods</caption>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Period</th>
                  <th scope="col" className="px-5 py-3 font-medium">Staff paid</th>
                  <th scope="col" className="px-5 py-3 font-medium">Total net pay</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => {
                  const total = p.payslips.reduce((sum, s) => sum + Number(s.netPay), 0);
                  return (
                    <tr key={p.id} className="hover:bg-brand-blue-light/40">
                      <td className="px-5 py-3 font-medium text-foreground">
                        {MONTHS[p.month - 1]} {p.year}
                      </td>
                      <td className="px-5 py-3 text-muted">{p.payslips.length}</td>
                      <td className="px-5 py-3 text-muted">{formatNaira(total)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={p.status === "PAID" ? "success" : p.status === "FINALIZED" ? "brand" : "neutral"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/payroll/${p.id}`} className="text-sm text-brand underline underline-offset-2">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
