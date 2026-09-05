import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const resolveSchema = z.object({
  status: z.enum(["RESOLVED", "ESCALATED"]),
  deductionAmount: z.string().optional().or(z.literal("")),
});

// Deciding the outcome of a query — including whether a salary deduction
// attaches to it — is kept to HR/Super Admin only (staff:resolve-query),
// even though a Supervisor may have issued the query in the first place.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "staff:resolve-query")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const query = await prisma.staffQuery.findUnique({ where: { id } });
  if (!query) return NextResponse.json({ message: "Query not found" }, { status: 404 });
  if (query.status === "RESOLVED") {
    return NextResponse.json({ message: "This query is already resolved." }, { status: 409 });
  }
  if (query.payslipId) {
    return NextResponse.json(
      { message: "This query's deduction has already been claimed by a payslip and can't be changed." },
      { status: 409 },
    );
  }

  const parsed = resolveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 422 });
  }

  const updated = await prisma.staffQuery.update({
    where: { id },
    data: {
      status: parsed.data.status,
      deductionAmount:
        parsed.data.status === "RESOLVED" && parsed.data.deductionAmount ? parsed.data.deductionAmount : undefined,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_QUERY_RESOLVED",
    targetType: "Staff",
    targetId: query.staffId,
    details: { queryId: query.id, status: parsed.data.status, deductionAmount: parsed.data.deductionAmount || null },
  });

  return NextResponse.json(updated);
}
