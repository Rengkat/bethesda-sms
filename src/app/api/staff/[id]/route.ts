import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const updateStaffSchema = z.object({
  fullName: z.string().min(1),
  staffCode: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  departmentId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "HR_ADMIN", "SUPERVISOR", "TEACHER", "HOUSE_PARENT", "SUPPORT_STAFF"]),
  category: z.enum(["TEACHING", "NON_TEACHING"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "VOLUNTEER"]),
  dateHired: z.string().min(1),
  dateExited: z.string().optional().or(z.literal("")),
  isVisuallyImpaired: z.union([z.literal("on"), z.literal("true")]).optional(),
  active: z.union([z.literal("on"), z.literal("true")]).optional(),

  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  stateOfOrigin: z.string().optional().or(z.literal("")),
  homeAddress: z.string().optional().or(z.literal("")),
  nextOfKinName: z.string().optional().or(z.literal("")),
  nextOfKinPhone: z.string().optional().or(z.literal("")),
  nextOfKinRelationship: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  bankAccountName: z.string().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional().or(z.literal("")),

  currentSalary: z.string().optional().or(z.literal("")),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const staff = await prisma.staff.findUnique({ where: { id }, include: { department: true } });
  if (!staff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });
  return NextResponse.json(staff);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:edit")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  const parsed = updateStaffSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const canSetSalary = can(role as never, "staff:edit-salary");

  const staff = await prisma.staff.update({
    where: { id },
    data: {
      fullName: data.fullName,
      staffCode: data.staffCode,
      email: data.email || null,
      phone: data.phone || null,
      departmentId: data.departmentId,
      role: data.role,
      category: data.category,
      employmentType: data.employmentType,
      dateHired: new Date(data.dateHired),
      dateExited: data.dateExited ? new Date(data.dateExited) : null,
      isVisuallyImpaired: data.isVisuallyImpaired === "on" || data.isVisuallyImpaired === "true",
      active: data.active === "on" || data.active === "true",

      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      maritalStatus: data.maritalStatus || null,
      nationality: data.nationality || null,
      stateOfOrigin: data.stateOfOrigin || null,
      homeAddress: data.homeAddress || null,
      nextOfKinName: data.nextOfKinName || null,
      nextOfKinPhone: data.nextOfKinPhone || null,
      nextOfKinRelationship: data.nextOfKinRelationship || null,
      bankName: data.bankName || null,
      bankAccountName: data.bankAccountName || null,
      bankAccountNumber: data.bankAccountNumber || null,

      // Same server-side stripping as create: salary is only ever written
      // by a caller with staff:edit-salary, regardless of what the form
      // sent (e.g. a Supervisor's browser DevTools can't grant it).
      ...(canSetSalary ? { currentSalary: data.currentSalary || null } : {}),
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_EDITED",
    targetType: "Staff",
    targetId: staff.id,
    details: { staffCode: staff.staffCode },
  });

  return NextResponse.json(staff);
}
