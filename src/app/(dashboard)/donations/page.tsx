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
import { serializeDonationForClient } from "@/lib/serialize";
import { CsvImportButton } from "@/components/shared/csv-import-button";
import { DateRangeExportButton } from "@/components/shared/date-range-export-button";
import { DateRangeFilterForm } from "@/components/shared/date-range-filter-form";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata = { title: "Donations" };

const PAGE_SIZE = 20;

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!role || !can(role as never, "donations:manage")) {
    return (
      <div className="space-y-6">
        <PageHeader title="Donations" description="Donor records and giving history." />
        <Card>
          <CardContent className="text-sm text-muted">
            Donation records are restricted to Super Admin and HR Admin. Ask an admin if you need
            access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { from, to, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let donatedAtFilter: { gte?: Date; lte?: Date } | undefined;
  if (from || to) {
    donatedAtFilter = {};
    if (from) donatedAtFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      donatedAtFilter.lte = toDate;
    }
  }

  const donationsQuery = prisma.donation.findMany({
    where: donatedAtFilter ? { donatedAt: donatedAtFilter } : undefined,
    include: { visitor: { select: { id: true, fullName: true } } },
    orderBy: { donatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  type DonationWithVisitor = Awaited<typeof donationsQuery>[number];

  const monthTotalQuery = prisma.donation.aggregate({
    _sum: { amount: true },
    where: { donatedAt: { gte: startOfMonth }, donationType: { not: "IN_KIND" }, voided: false },
  });
  type DonationAggregate = Awaited<typeof monthTotalQuery>;

  const [donations, totalCount, monthTotal, yearTotal] = await Promise.all([
    donationsQuery.catch((): DonationWithVisitor[] => []),
    prisma.donation
      .count({ where: donatedAtFilter ? { donatedAt: donatedAtFilter } : undefined })
      .catch((): number => 0),
    monthTotalQuery.catch((): DonationAggregate => ({ _sum: { amount: null } })),
    prisma.donation
      .aggregate({
        _sum: { amount: true },
        where: { donatedAt: { gte: startOfYear }, donationType: { not: "IN_KIND" }, voided: false },
      })
      .catch((): DonationAggregate => ({ _sum: { amount: null } })),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donations"
        description="Donor records and giving history — from donors to the organisation, unrelated to staff."
        actions={
          <>
            <CsvImportButton
              importUrl="/api/donations/import"
              templateUrl="/api/donations/template"
              label="Import CSV"
            />
            <DateRangeExportButton exportUrl="/api/donations/export" label="Export" />
            <DonationRegisterButton />
          </>
        }
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
        <div className="px-5 py-4 border-b border-border">
          <DateRangeFilterForm from={from} to={to} />
        </div>
        {donations.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={from || to ? "No donations in that range" : "No donations recorded yet"}
            description={
              from || to
                ? "Try a wider date range, or clear the filter."
                : "Record a donation as it comes in — cash, transfer, cheque, or goods."
            }
            action={<DonationRegisterButton />}
          />
        ) : (
          <>
            <DonationTable
              donations={donations.map((donation: DonationWithVisitor) =>
                serializeDonationForClient(donation),
              )}
            />
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              searchParams={{ from, to }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
