import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { sendLeaveDecisionNotification } from "@/lib/notifications";

const schema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "leave:approve")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid status" }, { status: 422 });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      approvedBy: session.user.id,
      decidedAt: new Date(),
    },
    include: { staff: true, leaveType: true },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: parsed.data.status === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    targetType: "LeaveRequest",
    targetId: updated.id,
  });

  if (updated.staff.email) {
    await sendLeaveDecisionNotification({
      staffEmail: updated.staff.email,
      staffName: updated.staff.fullName,
      leaveTypeName: updated.leaveType.name,
      status: parsed.data.status,
      startDate: updated.startDate,
      endDate: updated.endDate,
    }).catch((err) => console.error("[notifications] leave decision email failed:", err));
  }

  return NextResponse.json(updated);
}
