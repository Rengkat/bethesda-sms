import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DOCUMENT_TYPES = new Set([
  "ID_CARD",
  "CONTRACT",
  "QUALIFICATION_CERTIFICATE",
  "EXAM_RESULT",
  "MEDICAL_REPORT",
  "OTHER",
]);

/**
 * Stores the uploaded file on local disk under public/uploads/ and creates
 * the matching StaffDocument row.
 *
 * IMPORTANT — this only works for deployments with a persistent, writable
 * filesystem (a VPS, Docker on a real server, etc.). On serverless hosting
 * (Vercel, most PaaS) the filesystem is ephemeral/read-only in production,
 * so uploaded files would vanish on the next deploy or cold start. If you
 * deploy there, swap this for an object-storage upload (S3/Cloudflare
 * R2/Cloudinary) and store the returned URL in `fileUrl` instead — nothing
 * else in the app needs to change, since StaffDocument.fileUrl is just a
 * URL string either way.
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
  const label = formData.get("label");
  const type = formData.get("type");
  const expiresAt = formData.get("expiresAt");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Please choose a file." }, { status: 422 });
  }
  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ message: "Please give this document a label." }, { status: 422 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ message: "That file is too large (max 10MB)." }, { status: 422 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: "Only PDF, JPG, PNG, or WEBP files are accepted." },
      { status: 422 },
    );
  }

  const ext = path.extname(file.name) || "";
  const safeName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "staff-documents", staffId);
  await mkdir(uploadDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, safeName), bytes);

  const fileUrl = `/uploads/staff-documents/${staffId}/${safeName}`;

  const document = await prisma.staffDocument.create({
    data: {
      staffId,
      label: label.trim(),
      type: typeof type === "string" && DOCUMENT_TYPES.has(type) ? (type as never) : undefined,
      fileUrl,
      expiresAt: typeof expiresAt === "string" && expiresAt ? new Date(expiresAt) : undefined,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_DOCUMENT_UPLOADED",
    targetType: "Staff",
    targetId: staffId,
    details: { documentId: document.id, label: document.label },
  });

  return NextResponse.json(document, { status: 201 });
}
