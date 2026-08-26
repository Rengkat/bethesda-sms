import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyAttendance, minutesDeviation } from "@/lib/attendance-rules";
import { sendLateCheckInAlert } from "@/lib/notifications";

/**
 * Called by sync-bridge/sync.js on the Raspberry Pi every 5 minutes.
 * Auth is a shared secret header, not a user session — this endpoint is
 * never hit from the browser.
 */
const syncSchema = z.object({
  deviceId: z.string().min(1),
  logs: z.array(
    z.object({
      staffCode: z.string().min(1), // ZKTeco device user ID, mapped to Staff.staffCode
      timestamp: z.string().min(1), // ISO 8601
      type: z.enum(["CHECK_IN", "CHECK_OUT"]),
    }),
  ),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-device-sync-secret");
  if (!secret || secret !== process.env.DEVICE_SYNC_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { deviceId, logs } = parsed.data;

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    return NextResponse.json({ message: "Unknown device" }, { status: 404 });
  }

  let created = 0;
  let skipped = 0;

  for (const log of logs) {
    const staff = await prisma.staff.findUnique({ where: { staffCode: log.staffCode } });
    if (!staff) {
      skipped++;
      continue;
    }

    const timestamp = new Date(log.timestamp);

    // Look up an active shift assignment for this day of week to classify
    // the log; fall back to ON_TIME if no shift is configured yet.
    const assignment = await prisma.shiftAssignment.findFirst({
      where: {
        staffId: staff.id,
        daysOfWeek: { has: timestamp.getDay() },
        effectiveFrom: { lte: timestamp },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: timestamp } }],
      },
      include: { shiftType: true },
    });

    const status = assignment
      ? classifyAttendance(log.type, timestamp, assignment.shiftType)
      : ("ON_TIME" as const);

    await prisma.attendance.create({
      data: {
        staffId: staff.id,
        deviceId: device.id,
        timestamp,
        type: log.type,
        status,
        source: "BIOMETRIC",
      },
    });
    created++;

    if (status === "LATE" && assignment) {
      const supervisor = await prisma.staff.findFirst({
        where: { role: "SUPERVISOR", departmentId: staff.departmentId, email: { not: null } },
      });
      if (supervisor?.email) {
        await sendLateCheckInAlert({
          supervisorEmail: supervisor.email,
          staffName: staff.fullName,
          minutesLate: minutesDeviation(log.type, timestamp, assignment.shiftType),
          shiftName: assignment.shiftType.name,
        }).catch((err) => console.error("[notifications] late check-in alert failed:", err));
      }
    }
  }

  await prisma.device.update({ where: { id: device.id }, data: { lastSyncAt: new Date() } });

  return NextResponse.json({ created, skipped });
}
