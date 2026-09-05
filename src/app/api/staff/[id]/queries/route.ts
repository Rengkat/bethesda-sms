import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const issueQuerySchema = z.object({
  category: z.enum(["LATENESS", "ABSENTEEISM", "MISCONDUCT", "POLICY_VIOLATION", "PERFORMANCE", "OTHER"]),
  subject: z.string().min(1),
  description: z.string().min(1),
  responseDeadline: z.string().optional().or(z.literal("")),
});

// Issuing a query to a staff member: full access (SUPER_ADMIN/HR_ADMIN) can
// query anyone; a Supervisor can only query someone in their own
// department — checked here explicitly rather than via
// permissions.ts#isSupervisorOf, which hardcodes its full-access check to
// "staff:view-all" and isn't a generic same-department test.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id: staffId } = await params;
  const targetStaff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!targetStaff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  let allowed = can(role as never, "staff:issue-query");
  if (!allowed && role === "SUPERVISOR") {
    const supervisorStaffId = (session.user as { staffId?: string | null }).staffId;
    const supervisor = supervisorStaffId
      ? await prisma.staff.findUnique({ where: { id: supervisorStaffId } })
      : null;
    allowed = Boolean(supervisor && supervisor.departmentId === targetStaff.departmentId);
  }
  if (!allowed) {
    return NextResponse.json(
      { message: "You can only issue queries to staff in your own department." },
      { status: 403 },
    );
  }

  const issuedById = (session.user as { staffId?: string | null }).staffId;
  if (!issuedById) {
    return NextResponse.json(
      { message: "Your account isn't linked to a staff record, so a query can't be attributed to you." },
      { status: 400 },
    );
  }

  const parsed = issueQuerySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const query = await prisma.staffQuery.create({
    data: {
      staffId,
      issuedById,
      category: data.category,
      subject: data.subject,
      description: data.description,
      responseDeadline: data.responseDeadline ? new Date(data.responseDeadline) : undefined,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_QUERY_ISSUED",
    targetType: "Staff",
    targetId: staffId,
    details: { queryId: query.id, category: query.category, subject: query.subject },
  });

  return NextResponse.json(query, { status: 201 });
}
