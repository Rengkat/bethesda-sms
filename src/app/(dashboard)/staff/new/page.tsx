import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StaffForm } from "@/components/staff/staff-form";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const metadata = { title: "Add staff" };

export default async function NewStaffPage() {
  const [departments, session] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    auth.api.getSession({ headers: await headers() }),
  ]);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canEditSalary = Boolean(role && can(role as never, "staff:edit-salary"));

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Add staff" description="Create a new staff profile." />
      <Card>
        <CardContent>
          <StaffForm departments={departments} canEditSalary={canEditSalary} />
        </CardContent>
      </Card>
    </div>
  );
}
