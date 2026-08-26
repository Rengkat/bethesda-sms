import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  staffId: z.string().min(1),
  shiftTypeId: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  effectiveFrom: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "settings:manage")) {
    // Shift assignment is settings-adjacent (department heads shouldn't
    // reassign shifts org-wide); reuse the settings:manage gate rather than
    // adding a new action just for this one write.
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the assignment details." },
      { status: 422 },
    );
  }

  const assignment = await prisma.shiftAssignment.create({
    data: {
      staffId: parsed.data.staffId,
      shiftTypeId: parsed.data.shiftTypeId,
      daysOfWeek: parsed.data.daysOfWeek,
      effectiveFrom: new Date(parsed.data.effectiveFrom),
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "SHIFT_ASSIGNMENT_CREATED",
    targetType: "Settings",
    targetId: assignment.id,
    details: parsed.data,
  });

  return NextResponse.json(assignment, { status: 201 });
}
