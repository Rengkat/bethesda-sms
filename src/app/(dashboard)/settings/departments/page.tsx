import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { SettingsTabs } from "@/components/shared/settings-tabs";
import { DepartmentCreateButton } from "@/components/shared/department-create-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Departments" };

export default async function DepartmentsSettingsPage() {
  const departments = await prisma.department
    .findMany({ include: { _count: { select: { staff: true } } }, orderBy: { name: "asc" } })
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Departments, shift types, and devices."
        actions={<DepartmentCreateButton />}
      />

      <SettingsTabs active="departments" />

      <Card className="overflow-hidden">
        {departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Academics, Boarding/House, Admin, Kitchen, Security, Grounds — set up the departments staff will be assigned to."
          />
        ) : (
          <ul className="divide-y divide-border">
            {departments.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{d.name}</span>
                <span className="text-muted">{d._count.staff} staff</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
