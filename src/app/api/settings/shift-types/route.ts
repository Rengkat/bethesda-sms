import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  gracePeriodMinutes: z.coerce.number().int().min(0).max(120),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const shiftTypes = await prisma.shiftType.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(shiftTypes);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "settings:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the shift type details." },
      { status: 422 },
    );
  }

  const shiftType = await prisma.shiftType.create({ data: parsed.data });

  await writeAuditLog({
    actorId: session.user.id,
    action: "SHIFT_TYPE_CREATED",
    targetType: "Settings",
    targetId: shiftType.id,
    details: parsed.data,
  });

  return NextResponse.json(shiftType, { status: 201 });
}
