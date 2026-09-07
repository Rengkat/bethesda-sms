import { headers } from "next/headers";
import { Users2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { VisitorRegisterButton } from "@/components/visitors/visitor-register-button";
import { VisitorTable } from "@/components/visitors/visitor-table";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { CsvImportButton } from "@/components/shared/csv-import-button";
import { DateRangeExportButton } from "@/components/shared/date-range-export-button";
import { DateRangeFilterForm } from "@/components/shared/date-range-filter-form";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata = { title: "Visitors" };

const PAGE_SIZE = 20;

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const { from, to, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let timeInFilter: { gte?: Date; lte?: Date } | undefined;
  if (from || to) {
    timeInFilter = {};
    if (from) timeInFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      timeInFilter.lte = toDate;
    }
  }

  const [visitors, totalCount, todayCount, onSiteCount, session] = await Promise.all([
    prisma.visitor
      .findMany({
        where: timeInFilter ? { timeIn: timeInFilter } : undefined,
        orderBy: { timeIn: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
      .catch(() => []),
    prisma.visitor.count({ where: timeInFilter ? { timeIn: timeInFilter } : undefined }).catch(() => 0),
    prisma.visitor.count({ where: { timeIn: { gte: startOfDay }, voided: false } }).catch(() => 0),
    prisma.visitor.count({ where: { timeOut: null, voided: false } }).catch(() => 0),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canVoid = Boolean(role && can(role as never, "visitors:void"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description={`Digital sign-in book — ${formatDate(new Date())}`}
        actions={
          <>
            <CsvImportButton importUrl="/api/visitors/import" templateUrl="/api/visitors/template" label="Import CSV" />
            <DateRangeExportButton exportUrl="/api/visitors/export" label="Export" />
            <VisitorRegisterButton />
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Visitors today</p>
            <p className="text-xl font-semibold text-foreground">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Currently on site</p>
            <p className="text-xl font-semibold text-foreground">{onSiteCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <DateRangeFilterForm from={from} to={to} />
        </div>
        {visitors.length === 0 ? (
          <EmptyState
            icon={Users2}
            title={from || to ? "No visitors in that range" : "No visitors logged yet"}
            description={
              from || to
                ? "Try a wider date range, or clear the filter."
                : "Register a visitor as they arrive at the front desk — the same record covers signing them out later."
            }
            action={<VisitorRegisterButton />}
          />
        ) : (
          <>
            <VisitorTable visitors={visitors} canVoid={canVoid} />
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
