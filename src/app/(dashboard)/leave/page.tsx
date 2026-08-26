import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaveRequestCreateButton } from "@/components/leave/leave-request-create-button";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Leave" };

export default async function LeavePage() {
  const [requests, leaveTypes] = await Promise.all([
    prisma.leaveRequest
      .findMany({
        include: { staff: true, leaveType: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    prisma.leaveType.findMany({ orderBy: { name: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave"
        description="Requests, approvals, and balances across all leave types."
        actions={<LeaveRequestCreateButton leaveTypes={leaveTypes} />}
      />

      <Card className="overflow-hidden">
        {requests.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No leave requests yet"
            description="Requests submitted by staff will appear here for supervisor and HR approval."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Leave requests</caption>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Staff</th>
                  <th scope="col" className="px-5 py-3 font-medium">Type</th>
                  <th scope="col" className="px-5 py-3 font-medium">Dates</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-blue-light/40">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <Link href={`/leave/${r.id}`} className="hover:text-brand-blue-dark hover:underline">
                        {r.staff.fullName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{r.leaveType.name}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
