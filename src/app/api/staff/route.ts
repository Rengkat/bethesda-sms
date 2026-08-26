import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const createStaffSchema = z.object({
  fullName: z.string().min(1),
  staffCode: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  departmentId: z.string().min(1),
  role: z.enum([
    "SUPER_ADMIN",
    "HR_ADMIN",
    "SUPERVISOR",
    "TEACHER",
    "HOUSE_PARENT",
    "SUPPORT_STAFF",
  ]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "VOLUNTEER"]),
  dateHired: z.string().min(1),
  isVisuallyImpaired: z
    .union([z.literal("on"), z.literal("true")])
    .optional(),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const staff = await prisma.staff.findMany({
    include: { department: true },
    orderBy: { fullName: "asc" },
  });
  return NextResponse.json(staff);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const staff = await prisma.staff.create({
    data: {
      fullName: data.fullName,
      staffCode: data.staffCode,
      email: data.email || undefined,
      phone: data.phone || undefined,
      departmentId: data.departmentId,
      role: data.role,
      employmentType: data.employmentType,
      dateHired: new Date(data.dateHired),
      isVisuallyImpaired: data.isVisuallyImpaired === "on" || data.isVisuallyImpaired === "true",
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_CREATED",
    targetType: "Staff",
    targetId: staff.id,
    details: { staffCode: staff.staffCode },
  });

  return NextResponse.json(staff, { status: 201 });
}
