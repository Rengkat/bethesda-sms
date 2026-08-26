import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffFilters } from "@/components/staff/staff-filters";
import { prisma } from "@/lib/prisma";
import { StaffTable } from "@/components/staff/staff-table";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const staff = await prisma.staff
    .findMany({
      include: { department: true },
      orderBy: { fullName: "asc" },
      take: 50,
    })
    .catch(() => []); // no DB connected yet in a fresh checkout

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Teaching, boarding, and support staff records."
        actions={
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add staff
            </Link>
          </Button>
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
          <StaffTable staff={staff} />
        )}
      </Card>
    </div>
  );
}
