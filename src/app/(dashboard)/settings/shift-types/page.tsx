import { Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { SettingsTabs } from "@/components/shared/settings-tabs";
import { ShiftTypeCreateButton } from "@/components/shared/shift-type-create-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Shift types" };

export default async function ShiftTypesSettingsPage() {
  const shiftTypes = await prisma.shiftType.findMany({ orderBy: { name: "asc" } }).catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Departments, shift types, and devices."
        actions={<ShiftTypeCreateButton />}
      />

      <SettingsTabs active="shift-types" />

      <Card className="overflow-hidden">
        {shiftTypes.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No shift types yet"
            description="Define templates like 'School Day' (07:30–15:30) or 'Boarding Night', each with a grace period for lateness."
          />
        ) : (
          <ul className="divide-y divide-border">
            {shiftTypes.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted">
                  {s.startTime}–{s.endTime} · {s.gracePeriodMinutes} min grace
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
