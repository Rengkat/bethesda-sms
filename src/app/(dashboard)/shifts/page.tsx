import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ShiftTypeCreateButton } from "@/components/shared/shift-type-create-button";
import { AssignStaffButton } from "@/components/shifts/assign-staff-button";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Shifts" };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ShiftsPage() {
  const [shiftTypes, staff] = await Promise.all([
    prisma.shiftType
      .findMany({
        include: { assignments: { include: { staff: true } } },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
    prisma.staff.findMany({ where: { active: true }, select: { id: true, fullName: true, staffCode: true }, orderBy: { fullName: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        description="Shift type templates and per-staff assignments, including rotating boarding shifts."
        actions={<ShiftTypeCreateButton />}
      />

      {shiftTypes.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="No shift types configured"
            description="Create shift types like 'School Day' or 'Boarding Night' with start/end times and grace periods, then assign staff to them."
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shiftTypes.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-foreground">{shift.name}</h2>
                    <p className="text-sm text-muted mt-1">
                      {shift.startTime} – {shift.endTime} · {shift.gracePeriodMinutes} min grace
                    </p>
                  </div>
                  <AssignStaffButton shiftTypeId={shift.id} shiftTypeName={shift.name} staff={staff} />
                </div>

                {shift.assignments.length === 0 ? (
                  <p className="text-sm text-muted">No staff assigned yet.</p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {shift.assignments.map((a) => (
                      <li key={a.id} className="py-2 flex items-center justify-between">
                        <span className="text-foreground">{a.staff.fullName}</span>
                        <span className="text-muted text-xs">
                          {a.daysOfWeek
                            .slice()
                            .sort()
                            .map((d) => DAY_LABELS[d])
                            .join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
