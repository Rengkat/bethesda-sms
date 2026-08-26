import { Users, Fingerprint, CalendarCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

const stats = [
  { label: "Active staff", value: "—", icon: Users, tone: "brand" as const },
  { label: "Checked in today", value: "—", icon: Fingerprint, tone: "success" as const },
  { label: "Pending leave requests", value: "—", icon: CalendarCheck, tone: "warning" as const },
  { label: "Late today", value: "—", icon: AlertTriangle, tone: "danger" as const },
];

const toneClasses = {
  brand: "bg-brand-blue-light text-brand-blue-dark",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-danger-bg text-danger",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-1">
          Overview of today&apos;s attendance, leave, and staff activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[stat.tone]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <h2 className="text-base font-semibold mb-2">Getting started</h2>
          <p className="text-sm text-muted">
            Connect a database and run <code className="px-1 py-0.5 rounded bg-gray-100">npx prisma migrate dev</code>{" "}
            to seed departments, shift types, and your first admin account, then
            wire this dashboard up to live attendance and leave data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
