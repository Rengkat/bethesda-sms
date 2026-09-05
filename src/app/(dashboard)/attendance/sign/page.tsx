import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/utils";
import { SelfAttendanceCard } from "@/components/attendance/self-attendance-card";

export const metadata = { title: "Sign in / out" };

export default async function SelfAttendancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const staffId = (session.user as { staffId?: string | null }).staffId;

  if (!staffId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sign in / out" description="Your morning and evening attendance." />
        <Card>
          <div className="p-6 text-sm text-muted">
            Your account isn&apos;t linked to a staff record, so attendance can&apos;t be logged
            here. Ask HR/Admin to link your login to your staff profile.
          </div>
        </Card>
      </div>
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const today = await prisma.attendance.findMany({
    where: { staffId, timestamp: { gte: startOfDay } },
    orderBy: { timestamp: "asc" },
  });

  const checkIn = today.find((a) => a.type === "CHECK_IN");
  const checkOut = today.find((a) => a.type === "CHECK_OUT");

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Sign in / out" description={`Today — ${formatDate(new Date())}`} />

      <Card>
        <SelfAttendanceCard
          hasCheckedIn={Boolean(checkIn)}
          hasCheckedOut={Boolean(checkOut)}
          checkInTime={checkIn?.timestamp}
          checkOutTime={checkOut?.timestamp}
        />
      </Card>

      {today.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Today&apos;s log</h2>
          </div>
          <ul className="divide-y divide-border">
            {today.map((a) => (
              <li key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span>{a.type === "CHECK_IN" ? "Signed in" : "Signed out"} at {formatTime(a.timestamp)}</span>
                <Badge tone={a.status === "ON_TIME" ? "success" : a.status === "MANUAL_OVERRIDE" ? "brand" : "warning"}>
                  {a.status.replace(/_/g, " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
