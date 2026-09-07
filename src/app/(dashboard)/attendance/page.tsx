import Link from "next/link";
import { headers } from "next/headers";
import { PencilLine, Fingerprint, LogIn } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate, formatTime } from "@/lib/utils";
import { AttendanceImportButton } from "@/components/attendance/attendance-import-button";
import { DateRangeExportButton } from "@/components/shared/date-range-export-button";

import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata = { title: "Attendance" };

const PAGE_SIZE = 30;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canBulkImport = Boolean(role && can(role as never, "attendance:manual-override"));

  const [attendances, totalCount] = await Promise.all([
    prisma.attendance
      .findMany({
        where: { timestamp: { gte: today } },
        include: { staff: true, device: true },
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      })
      .catch(() => []),
    prisma.attendance.count({ where: { timestamp: { gte: today } } }).catch(() => 0),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description={`Daily view — ${formatDate(today)}`}
        actions={
          <>
            <Button asChild>
              <Link href="/attendance/sign">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in / out
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/attendance/manual-entry">
                <PencilLine className="h-4 w-4" aria-hidden="true" />
                Manual entry
              </Link>
            </Button>
            <DateRangeExportButton exportUrl="/api/reports/export?report=attendance-summary" label="Export" />
            {canBulkImport && <AttendanceImportButton />}
          </>
        }
      />

      <Card className="overflow-hidden">
        {attendances.length === 0 ? (
          <EmptyState
            icon={Fingerprint}
            title="No attendance logged today"
            description="Biometric logs sync automatically every 5 minutes, or add a manual entry."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Today&apos;s attendance log</caption>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Staff</th>
                  <th scope="col" className="px-5 py-3 font-medium">Device</th>
                  <th scope="col" className="px-5 py-3 font-medium">Type</th>
                  <th scope="col" className="px-5 py-3 font-medium">Time</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendances.map((a) => (
                  <tr key={a.id} className="hover:bg-brand-blue-light/40">
                    <td className="px-5 py-3 font-medium text-foreground">{a.staff.fullName}</td>
                    <td className="px-5 py-3 text-muted">{a.device.name}</td>
                    <td className="px-5 py-3 text-muted">{a.type === "CHECK_IN" ? "Check in" : "Check out"}</td>
                    <td className="px-5 py-3 text-muted">{formatTime(a.timestamp)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={a.status === "ON_TIME" ? "success" : a.status === "MANUAL_OVERRIDE" ? "brand" : "warning"}>
                        {a.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{formatSource(a.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <PaginationControls currentPage={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} />
          </>
        )}
      </Card>
    </div>
  );
}

function formatSource(source: string) {
  if (source === "BIOMETRIC") return "Biometric";
  if (source === "WEB_SELF") return "Self sign-in";
  return "Manual";
}
