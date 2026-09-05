import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyAttendance } from "@/lib/attendance-rules";
import { writeAuditLog } from "@/lib/audit";

// Name/IP used to identify the virtual "device" that self-service sign-ins
// are attributed to, since Attendance.deviceId is required by the schema
// (every other row comes from a real biometric unit). Looked up once and
// reused — see getOrCreateWebDevice below.
const WEB_DEVICE_NAME = "Self-Service (Web)";

async function getOrCreateWebDevice() {
  const existing = await prisma.device.findFirst({ where: { name: WEB_DEVICE_NAME } });
  if (existing) return existing;
  return prisma.device.create({
    data: { name: WEB_DEVICE_NAME, localIp: "n/a", location: "Staff dashboard (self sign-in/out)" },
  });
}

/**
 * Staff self sign-in / sign-out for the morning/evening attendance book.
 * Not every post (kitchen, grounds, security, etc.) sits near the ZKTeco
 * unit at the main entrance, so this gives every signed-in staff member a
 * fallback way to log their own attendance from the dashboard. It infers
 * whether this call is a check-in or check-out from what's already logged
 * for them today, so there is nothing for the staff member to select —
 * one button, "Sign in" in the morning, "Sign out" in the evening.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const staffId = (session.user as { staffId?: string | null }).staffId;
  if (!staffId) {
    return NextResponse.json(
      { message: "Your account isn't linked to a staff record, so attendance can't be logged." },
      { status: 400 },
    );
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const todaysAttendance = await prisma.attendance.findMany({
    where: { staffId, timestamp: { gte: startOfDay } },
    orderBy: { timestamp: "asc" },
  });

  const hasCheckedIn = todaysAttendance.some((a) => a.type === "CHECK_IN");
  const hasCheckedOut = todaysAttendance.some((a) => a.type === "CHECK_OUT");

  if (hasCheckedIn && hasCheckedOut) {
    return NextResponse.json(
      { message: "You've already signed in and out today." },
      { status: 409 },
    );
  }

  const type = hasCheckedIn ? "CHECK_OUT" : "CHECK_IN";

  // Look up today's shift assignment (if any) so lateness/early-departure
  // is classified the same way a biometric check-in would be.
  const dayOfWeek = now.getDay();
  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      staffId,
      daysOfWeek: { has: dayOfWeek },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: { shiftType: true },
  });

  const status = assignment
    ? classifyAttendance(type, now, {
        startTime: assignment.shiftType.startTime,
        endTime: assignment.shiftType.endTime,
        gracePeriodMinutes: assignment.shiftType.gracePeriodMinutes,
      })
    : "MANUAL_OVERRIDE"; // no shift assigned — logged, but flagged for HR to review

  const device = await getOrCreateWebDevice();

  const attendance = await prisma.attendance.create({
    data: {
      staffId,
      deviceId: device.id,
      type,
      timestamp: now,
      status,
      source: "WEB_SELF",
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: type === "CHECK_IN" ? "SELF_SIGN_IN" : "SELF_SIGN_OUT",
    targetType: "Attendance",
    targetId: attendance.id,
    details: { staffId, timestamp: now.toISOString() },
  });

  return NextResponse.json(attendance, { status: 201 });
}
