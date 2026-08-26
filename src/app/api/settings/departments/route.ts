import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ name: z.string().min(1) });

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(departments);
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
    return NextResponse.json({ message: "Please provide a department name." }, { status: 422 });
  }

  const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ message: "A department with this name already exists." }, { status: 409 });
  }

  const department = await prisma.department.create({ data: { name: parsed.data.name } });

  await writeAuditLog({
    actorId: session.user.id,
    action: "DEPARTMENT_CREATED",
    targetType: "Settings",
    targetId: department.id,
    details: { name: department.name },
  });

  return NextResponse.json(department, { status: 201 });
}
