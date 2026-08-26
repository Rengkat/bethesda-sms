import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StaffForm } from "@/components/staff/staff-form";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Add staff" };

export default async function NewStaffPage() {
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } }).catch(() => []);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Add staff" description="Create a new staff profile." />
      <Card>
        <CardContent>
          <StaffForm departments={departments} />
        </CardContent>
      </Card>
    </div>
  );
}
