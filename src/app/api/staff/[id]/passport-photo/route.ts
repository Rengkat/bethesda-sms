import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB — a passport photo has no business being large
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Sets (or replaces) Staff.passportPhotoUrl. Same local-disk approach and
 * same production caveat as staff documents (see the comment in
 * api/staff/[id]/documents/route.ts) — swap for object storage if you
 * deploy somewhere serverless.
 *
 * Wherever the app shows this photo, it already falls back to an
 * initials avatar when passportPhotoUrl is null (staff detail page, the
 * ID card) — nothing else needs to change for that fallback; this route
 * is only what sets or clears the field itself.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: staffId } = await params;
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Please choose a photo." }, { status: 422 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: "That photo is too large (max 5MB)." }, { status: 422 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ message: "Only JPG, PNG, or WEBP photos are accepted." }, { status: 422 });
  }

  const ext = path.extname(file.name) || "";
  const safeName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "staff-photos", staffId);
  await mkdir(uploadDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), bytes);

  const fileUrl = `/uploads/staff-photos/${staffId}/${safeName}`;
  const previousUrl = staff.passportPhotoUrl;

  const updated = await prisma.staff.update({
    where: { id: staffId },
    data: { passportPhotoUrl: fileUrl },
  });

  // Best-effort cleanup of the old photo file. Never block the response
  // on this — a leftover unused file on disk is harmless; failing the
  // upload because the OLD file couldn't be deleted would not be.
  if (previousUrl && previousUrl.startsWith("/uploads/staff-photos/")) {
    unlink(path.join(process.cwd(), "public", previousUrl)).catch(() => {});
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_PHOTO_UPLOADED",
    targetType: "Staff",
    targetId: staffId,
    details: {},
  });

  return NextResponse.json(updated);
}

/** Clears the photo — the staff member reverts to showing initials everywhere. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: staffId } = await params;
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  const updated = await prisma.staff.update({
    where: { id: staffId },
    data: { passportPhotoUrl: null },
  });

  if (staff.passportPhotoUrl && staff.passportPhotoUrl.startsWith("/uploads/staff-photos/")) {
    unlink(path.join(process.cwd(), "public", staff.passportPhotoUrl)).catch(() => {});
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_PHOTO_REMOVED",
    targetType: "Staff",
    targetId: staffId,
    details: {},
  });

  return NextResponse.json(updated);
}
