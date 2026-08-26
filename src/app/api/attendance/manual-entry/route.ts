import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  staffId: z.string().min(1),
  deviceId: z.string().min(1),
  type: z.enum(["CHECK_IN", "CHECK_OUT"]),
  timestamp: z.string().min(1),
  reason: z.string().min(1, "A reason is required for every manual override."),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "attendance:manual-override")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid entry", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { staffId, deviceId, type, timestamp, reason } = parsed.data;

  const attendance = await prisma.attendance.create({
    data: {
      staffId,
      deviceId,
      type,
      timestamp: new Date(timestamp),
      status: "MANUAL_OVERRIDE",
      source: "MANUAL",
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "MANUAL_ATTENDANCE_OVERRIDE",
    targetType: "Attendance",
    targetId: attendance.id,
    details: { reason, staffId, type, timestamp },
  });

  return NextResponse.json(attendance, { status: 201 });
}
