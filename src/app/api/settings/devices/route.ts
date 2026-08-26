import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  localIp: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Enter a valid IPv4 address"),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(devices);
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
      { message: parsed.error.issues[0]?.message ?? "Please check the device details." },
      { status: 422 },
    );
  }

  const device = await prisma.device.create({ data: parsed.data });

  await writeAuditLog({
    actorId: session.user.id,
    action: "DEVICE_REGISTERED",
    targetType: "Device",
    targetId: device.id,
    details: parsed.data,
  });

  return NextResponse.json(device, { status: 201 });
}
