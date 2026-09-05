import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const voidSchema = z.object({ reason: z.string().min(1, "A reason is required to void an entry.") });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "visitors:void")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.visitor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Visitor not found" }, { status: 404 });
  if (existing.voided) {
    return NextResponse.json({ message: "This entry is already voided." }, { status: 409 });
  }

  const parsed = voidSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 422 });
  }

  const voided = await prisma.visitor.update({
    where: { id },
    data: {
      voided: true,
      voidedAt: new Date(),
      voidedBy: session.user.id,
      voidReason: parsed.data.reason,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "VISITOR_VOIDED",
    targetType: "Visitor",
    targetId: voided.id,
    details: { reason: parsed.data.reason },
  });

  return NextResponse.json(voided);
}
