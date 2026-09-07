import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { generateStaffCode } from "@/lib/staff-code";

const createStaffSchema = z.object({
  fullName: z.string().min(1),
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
  category: z.enum(["TEACHING", "NON_TEACHING"]),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "VOLUNTEER"]),
  dateHired: z.string().min(1),
  isVisuallyImpaired: z
    .union([z.literal("on"), z.literal("true")])
    .optional(),

  // Personal detail — all optional at intake, filled in over time.
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"])
    .optional()
    .or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  stateOfOrigin: z.string().optional().or(z.literal("")),
  homeAddress: z.string().optional().or(z.literal("")),
  nextOfKinName: z.string().optional().or(z.literal("")),
  nextOfKinPhone: z.string().optional().or(z.literal("")),
  nextOfKinRelationship: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  bankAccountName: z.string().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional().or(z.literal("")),

  // Only ever honoured if the caller has staff:edit-salary — see below.
  currentSalary: z.string().optional().or(z.literal("")),
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
  const isVisuallyImpaired = data.isVisuallyImpaired === "on" || data.isVisuallyImpaired === "true";
  // Generated here, not accepted from the client — see the schema comment
  // above and lib/staff-code.ts for the BHB-ST-####/BHB-VI-#### scheme.
  const staffCode = await generateStaffCode(isVisuallyImpaired);

  // Salary is stripped server-side (not just hidden client-side) for any
  // role without staff:edit-salary, even if a payload somehow included it —
  // never trust field-level authorization to the client.
  const canSetSalary = can(role as never, "staff:edit-salary");

  // Extremely unlikely (staffCode generation reads-then-writes, not
  // atomic) but not impossible under concurrent creates — retry once
  // with a freshly generated code rather than surfacing a raw 500 for a
  // unique-constraint collision the requester can't do anything about.
  async function createWithCode(code: string) {
    return prisma.staff.create({
    data: {
      fullName: data.fullName,
      staffCode: code,
      email: data.email || undefined,
      phone: data.phone || undefined,
      departmentId: data.departmentId,
      role: data.role,
      category: data.category,
      employmentType: data.employmentType,
      dateHired: new Date(data.dateHired),
      isVisuallyImpaired,

      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender || undefined,
      maritalStatus: data.maritalStatus || undefined,
      nationality: data.nationality || undefined,
      stateOfOrigin: data.stateOfOrigin || undefined,
      homeAddress: data.homeAddress || undefined,
      nextOfKinName: data.nextOfKinName || undefined,
      nextOfKinPhone: data.nextOfKinPhone || undefined,
      nextOfKinRelationship: data.nextOfKinRelationship || undefined,
      bankName: data.bankName || undefined,
      bankAccountName: data.bankAccountName || undefined,
      bankAccountNumber: data.bankAccountNumber || undefined,

      currentSalary: canSetSalary && data.currentSalary ? data.currentSalary : undefined,
    },
    });
  }

  let staff;
  try {
    staff = await createWithCode(staffCode);
  } catch (err) {
    const isUniqueConflict = err instanceof Error && err.message.includes("Unique constraint");
    if (!isUniqueConflict) throw err;
    staff = await createWithCode(await generateStaffCode(isVisuallyImpaired));
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_CREATED",
    targetType: "Staff",
    targetId: staff.id,
    details: { staffCode: staff.staffCode },
  });

  return NextResponse.json(staff, { status: 201 });
}
