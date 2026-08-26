import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendLeaveRequestSubmittedNotification } from "@/lib/notifications";

const schema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional().or(z.literal("")),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const requests = await prisma.leaveRequest.findMany({
    include: { staff: true, leaveType: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = session.user as { id: string; staffId?: string | null };
  if (!user.staffId) {
    return NextResponse.json(
      { message: "This account isn't linked to a staff record. Ask HR to link it before requesting leave." },
      { status: 422 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the leave request details." },
      { status: 422 },
    );
  }

  const { leaveTypeId, startDate, endDate, reason } = parsed.data;

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ message: "End date can't be before the start date." }, { status: 422 });
  }

  const staff = await prisma.staff.findUnique({ where: { id: user.staffId } });
  if (!staff) {
    return NextResponse.json({ message: "Linked staff record not found." }, { status: 422 });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      staffId: staff.id,
      leaveTypeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || undefined,
    },
    include: { leaveType: true },
  });

  // Notify the staff member's department supervisor (falls back to HR
  // Admin if the department has no supervisor on record yet).
  const approver =
    (await prisma.staff.findFirst({
      where: { role: "SUPERVISOR", departmentId: staff.departmentId, email: { not: null } },
    })) ??
    (await prisma.staff.findFirst({ where: { role: "HR_ADMIN", email: { not: null } } }));

  if (approver?.email) {
    await sendLeaveRequestSubmittedNotification({
      approverEmail: approver.email,
      staffName: staff.fullName,
      leaveTypeName: leaveRequest.leaveType.name,
    }).catch((err) => console.error("[notifications] leave submitted email failed:", err));
  }

  return NextResponse.json(leaveRequest, { status: 201 });
}
