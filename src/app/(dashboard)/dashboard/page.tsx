import { headers } from "next/headers";
import { Users, Fingerprint, CalendarCheck, AlertTriangle, UserCheck2, Users2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  AttendanceTrendChart,
  DepartmentBreakdownChart,
  DonationsTrendChart,
} from "@/components/dashboard/dashboard-charts";

export const metadata = { title: "Dashboard" };

const toneClasses = {
  brand: "bg-brand-blue-light text-brand-blue-dark",
  success: "bg-green-50 text-success",
  warning: "bg-amber-50 text-warning",
  danger: "bg-danger-bg text-danger",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  tone: keyof typeof toneClasses;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canSeeDonations = Boolean(role && can(role as never, "donations:manage"));

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(startOfDay);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeStaffCount,
    teachingCount,
    departments,
    checkInsToday,
    pendingLeaveCount,
    onSiteVisitorCount,
    weekAttendance,
    donationsRecent,
  ] = await Promise.all([
    prisma.staff.count({ where: { active: true } }).catch(() => 0),
    prisma.staff.count({ where: { active: true, category: "TEACHING" } }).catch(() => 0),
    prisma.staff.groupBy({ by: ["departmentId"], _count: { _all: true } }).catch(() => []),
    prisma.attendance
      .findMany({ where: { type: "CHECK_IN", timestamp: { gte: startOfDay } }, distinct: ["staffId"] })
      .catch(() => []),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.visitor.count({ where: { timeOut: null, voided: false } }).catch(() => 0),
    prisma.attendance
      .findMany({
        where: { type: "CHECK_IN", timestamp: { gte: sevenDaysAgo } },
        select: { timestamp: true, status: true },
      })
      .catch(() => []),
    canSeeDonations
      ? prisma.donation
          .findMany({
            where: { donatedAt: { gte: sixMonthsAgo }, donationType: { not: "IN_KIND" }, voided: false },
            select: { donatedAt: true, amount: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const departmentNames = await prisma.department.findMany().catch(() => []);
  const departmentNameById = new Map(departmentNames.map((d) => [d.id, d.name]));

  const lateToday = checkInsToday.filter((a) => a.status === "LATE").length;

  // --- Build the 7-day attendance trend buckets ---
  const trendBuckets = new Map<string, { onTime: number; late: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    trendBuckets.set(d.toDateString(), { onTime: 0, late: 0 });
  }
  for (const a of weekAttendance) {
    const key = new Date(a.timestamp).toDateString();
    const bucket = trendBuckets.get(key);
    if (!bucket) continue;
    if (a.status === "LATE") bucket.late += 1;
    else bucket.onTime += 1;
  }
  const attendanceTrendData = Array.from(trendBuckets.entries()).map(([dateStr, counts]) => ({
    day: DAY_LABELS[new Date(dateStr).getDay()],
    ...counts,
  }));

  // --- Department breakdown for the pie chart ---
  const departmentBreakdownData = departments.map((d) => ({
    name: departmentNameById.get(d.departmentId) ?? "Unknown",
    value: d._count._all,
  }));

  // --- Donations trend (last 6 months), admin/HR only ---
  const donationBuckets = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
    donationBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const don of donationsRecent) {
    const d = new Date(don.donatedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (donationBuckets.has(key)) {
      donationBuckets.set(key, donationBuckets.get(key)! + Number(don.amount ?? 0));
    }
  }
  const donationsTrendData = Array.from(donationBuckets.entries()).map(([key, total]) => {
    const [, monthIdx] = key.split("-").map(Number);
    return { month: MONTH_LABELS[monthIdx], total };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-1">
          Overview of today&apos;s attendance, leave, visitors, and staff activity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active staff" value={activeStaffCount} icon={Users} tone="brand" />
        <StatCard label="Checked in today" value={checkInsToday.length} icon={Fingerprint} tone="success" />
        <StatCard label="Pending leave requests" value={pendingLeaveCount} icon={CalendarCheck} tone="warning" />
        <StatCard label="Late today" value={lateToday} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Teaching staff" value={`${teachingCount} of ${activeStaffCount}`} icon={UserCheck2} tone="brand" />
        <StatCard label="Visitors on site now" value={onSiteVisitorCount} icon={Users2} tone="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attendance — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff by department</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentBreakdownData.length === 0 ? (
              <p className="text-sm text-muted">No department data yet.</p>
            ) : (
              <DepartmentBreakdownChart data={departmentBreakdownData} />
            )}
          </CardContent>
        </Card>
      </div>

      {canSeeDonations && (
        <Card>
          <CardHeader>
            <CardTitle>Donations — last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsTrendChart data={donationsTrendData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
