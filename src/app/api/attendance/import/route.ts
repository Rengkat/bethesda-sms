import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { parseCsvToObjects } from "@/lib/csv";

/**
 * Bulk backfill for when the biometric device was down (or a paper
 * register was kept temporarily) and there's too much attendance to
 * enter one-by-one through /attendance/manual-entry. Every imported row
 * becomes a MANUAL_OVERRIDE record, source MANUAL — exactly like a single
 * manual entry, just batched — and the whole batch shares one `reason`
 * (required, same as the single-entry form) so there's one clear
 * accountability note for "why is there a block of manual entries here"
 * instead of forcing a duplicate reason per row.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "attendance:manual-override")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const reason = formData.get("reason");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please choose a CSV file." }, { status: 422 });
  }
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ message: "A reason is required for a bulk manual import." }, { status: 422 });
  }

  const text = await file.text();
  const rows = parseCsvToObjects(text).filter((r) => r.staffCode && !r.staffCode.startsWith("#"));

  if (rows.length === 0) {
    return NextResponse.json({ message: "No valid rows found in that file." }, { status: 422 });
  }

  const staffCodes = [...new Set(rows.map((r) => r.staffCode?.trim()).filter(Boolean))];
  const deviceNames = [...new Set(rows.map((r) => r.deviceName?.trim()).filter(Boolean))];
  const [staffList, deviceList] = await Promise.all([
    prisma.staff.findMany({ where: { staffCode: { in: staffCodes } } }),
    prisma.device.findMany({ where: { name: { in: deviceNames } } }),
  ]);
  const staffByCode = new Map(staffList.map((s) => [s.staffCode, s.id]));
  const deviceByName = new Map(deviceList.map((d) => [d.name, d.id]));

  const errors: string[] = [];
  const toCreate: Array<Parameters<typeof prisma.attendance.create>[0]["data"]> = [];

  rows.forEach((row, i) => {
    const lineNo = i + 2;
    const staffId = staffByCode.get(row.staffCode?.trim());
    const deviceId = deviceByName.get(row.deviceName?.trim());
    const type = row.type?.trim().toUpperCase();
    const timestamp = row.timestamp ? new Date(row.timestamp.replace(" ", "T")) : null;

    if (!staffId) {
      errors.push(`Row ${lineNo}: no staff found with staffCode "${row.staffCode}"`);
      return;
    }
    if (!deviceId) {
      errors.push(`Row ${lineNo}: no device found named "${row.deviceName}"`);
      return;
    }
    if (type !== "CHECK_IN" && type !== "CHECK_OUT") {
      errors.push(`Row ${lineNo}: invalid type "${row.type}" (must be CHECK_IN or CHECK_OUT)`);
      return;
    }
    if (!timestamp || Number.isNaN(timestamp.getTime())) {
      errors.push(`Row ${lineNo}: invalid timestamp "${row.timestamp}" (use YYYY-MM-DD HH:mm)`);
      return;
    }

    toCreate.push({
      staffId,
      deviceId,
      type: type as never,
      timestamp,
      status: "MANUAL_OVERRIDE",
      source: "MANUAL",
    });
  });

  if (toCreate.length > 0) {
    await prisma.attendance.createMany({ data: toCreate });
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "ATTENDANCE_BULK_IMPORTED",
    targetType: "Attendance",
    targetId: "bulk",
    details: { reason, created: toCreate.length, skipped: errors.length },
  });

  return NextResponse.json({ created: toCreate.length, skipped: errors.length, errors: errors.slice(0, 20) });
}
