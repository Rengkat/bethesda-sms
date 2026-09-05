import { headers } from "next/headers";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { DonationRegisterButton } from "@/components/donations/donation-register-button";
import { DonationTable } from "@/components/donations/donation-table";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatNaira } from "@/lib/utils";

export const metadata = { title: "Donations" };

export default async function DonationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!role || !can(role as never, "donations:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Donations" description="Donor records and giving history." />
        <Card>
          <CardContent className="text-sm text-muted">
            Donation records are restricted to Super Admin and HR Admin. Ask an admin if you
            need access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [donations, staff, monthTotal, yearTotal] = await Promise.all([
    prisma.donation.findMany({ include: { receivedBy: true }, orderBy: { donatedAt: "desc" }, take: 100 }).catch(() => []),
    prisma.staff.findMany({ where: { active: true }, orderBy: { fullName: "asc" } }).catch(() => []),
    prisma.donation
      .aggregate({
        _sum: { amount: true },
        where: { donatedAt: { gte: startOfMonth }, donationType: { not: "IN_KIND" }, voided: false },
      })
      .catch(() => ({ _sum: { amount: null } })),
    prisma.donation
      .aggregate({
        _sum: { amount: true },
        where: { donatedAt: { gte: startOfYear }, donationType: { not: "IN_KIND" }, voided: false },
      })
      .catch(() => ({ _sum: { amount: null } })),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Donor records and giving history."
        actions={<DonationRegisterButton staff={staff} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">This month (cash/transfer/cheque)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatNaira(monthTotal._sum.amount?.toString() ?? "0")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Year to date (cash/transfer/cheque)</p>
            <p className="text-xl font-semibold text-foreground">
              {formatNaira(yearTotal._sum.amount?.toString() ?? "0")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {donations.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="No donations recorded yet"
            description="Record a donation as it comes in — cash, transfer, cheque, or goods."
            action={<DonationRegisterButton staff={staff} />}
          />
        ) : (
          <DonationTable donations={donations} staff={staff} />
        )}
      </Card>
    </div>
  );
}
