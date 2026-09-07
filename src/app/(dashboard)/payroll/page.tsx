import Link from "next/link";
import { headers } from "next/headers";
import { Wallet, UserCog, Gavel, Calculator, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayrollGenerateButton } from "@/components/payroll/payroll-generate-button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatNaira } from "@/lib/utils";

import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata = { title: "Payroll" };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PAGE_SIZE = 20;

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
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

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [periods, totalCount] = await Promise.all([
    prisma.payrollPeriod
      .findMany({
        include: { payslips: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
      .catch(() => []),
    prisma.payrollPeriod.count().catch(() => 0),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Monthly salary runs and payslips."
        actions={<PayrollGenerateButton />}
      />

      {periods.length === 0 && (
        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">How payroll works here</h2>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <li className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue-dark">
                  <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-muted">
                  Make sure each staff member has a <strong className="text-foreground">monthly salary</strong> set
                  on their profile (Staff → Edit). Only staff with a salary on file get a payslip.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue-dark">
                  <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-muted">
                  Resolve any pending <strong className="text-foreground">queries or deductions</strong> on a staff
                  profile beforehand — this covers <strong className="text-foreground">any offence</strong>
                  (lateness, absenteeism, misconduct, policy violation, performance, or any other one-off
                  reason). Only resolved ones with an amount attached get deducted.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue-dark">
                  <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-muted">
                  Click <strong className="text-foreground">Generate payroll</strong> and pick the month —
                  there&apos;s nothing else to configure. Every active salaried staff member gets a payslip.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue-dark">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-muted">
                  Review the payslips, then <strong className="text-foreground">Finalize</strong> to lock the figures,
                  pay through your normal bank process, then <strong className="text-foreground">Mark as paid</strong>.
                </span>
              </li>
            </ol>
            <p className="text-xs text-muted mt-4 pt-4 border-t border-border">
              This app computes what each person should be paid — it does not send money anywhere.
              There&apos;s no bank transfer built in; use the bank details already on each staff profile to
              pay them through your normal channel, then come back and mark the period paid.
            </p>
          </div>
        </Card>
      )}

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
        <PaginationControls currentPage={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} />
      </Card>
    </div>
  );
}
