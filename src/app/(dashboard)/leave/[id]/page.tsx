import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { LeaveDecisionForm } from "@/components/leave/leave-decision-form";

export const metadata = { title: "Leave request" };

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const request = await prisma.leaveRequest
    .findUnique({
      where: { id },
      include: { staff: { include: { department: true } }, leaveType: true },
    })
    .catch(() => null);

  if (!request) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`${request.leaveType.name} leave — ${request.staff.fullName}`}
        description={`${request.staff.department.name} · ${formatDate(request.startDate)} – ${formatDate(request.endDate)}`}
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Status</span>
            <Badge tone={request.status === "APPROVED" ? "success" : request.status === "REJECTED" ? "danger" : "warning"}>
              {request.status}
            </Badge>
          </div>

          {request.reason && (
            <div>
              <p className="text-sm text-muted mb-1">Reason</p>
              <p className="text-sm text-foreground">{request.reason}</p>
            </div>
          )}

          {request.status === "PENDING" && <LeaveDecisionForm requestId={request.id} />}
        </CardContent>
      </Card>
    </div>
  );
}
