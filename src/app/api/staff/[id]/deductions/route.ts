import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const deductionSchema = z.object({
  reason: z.string().min(1),
  amount: z.coerce.number().positive(),
});

// A direct salary deduction not tied to a StaffQuery — see the schema
// comment on StaffDeduction. Full access only (staff:issue-deduction) —
// same trust tier as salary itself.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:issue-deduction")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id: staffId } = await params;
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  const issuedById = (session.user as { staffId?: string | null }).staffId;
  if (!issuedById) {
    return NextResponse.json(
      { message: "Your account isn't linked to a staff record, so a deduction can't be attributed to you." },
      { status: 400 },
    );
  }

  const parsed = deductionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const deduction = await prisma.staffDeduction.create({
    data: {
      staffId,
      issuedById,
      reason: parsed.data.reason,
      amount: parsed.data.amount,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_DEDUCTION_ISSUED",
    targetType: "Staff",
    targetId: staffId,
    details: { deductionId: deduction.id, amount: parsed.data.amount, reason: parsed.data.reason },
  });

  return NextResponse.json(deduction, { status: 201 });
}
