import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffFilters } from "@/components/staff/staff-filters";
import { prisma } from "@/lib/prisma";
import { StaffTable } from "@/components/staff/staff-table";
import { CsvImportButton } from "@/components/shared/csv-import-button";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata = { title: "Staff" };

const PAGE_SIZE = 20;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [staff, totalCount] = await Promise.all([
    prisma.staff
      .findMany({
        include: { department: true },
        orderBy: { fullName: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
      .catch(() => []), // no DB connected yet in a fresh checkout
    prisma.staff.count().catch(() => 0),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Teaching, boarding, and support staff records."
        actions={
          <>
            <CsvImportButton importUrl="/api/staff/import" templateUrl="/api/staff/template" label="Import CSV" />
            <ExportCsvButton href="/api/staff/export" />
            <Button asChild>
              <Link href="/staff/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add staff
              </Link>
            </Button>
          </>
        }
      />

      <StaffFilters />

      <Card className="overflow-hidden">
        {staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff records yet"
            description="Add your first staff member, or connect the database to see existing records."
            action={
              <Button asChild variant="secondary">
                <Link href="/staff/new">Add staff</Link>
              </Button>
            }
          />
        ) : (
          <>
            <StaffTable staff={staff} />
            <PaginationControls currentPage={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} />
          </>
        )}
      </Card>
    </div>
  );
}
