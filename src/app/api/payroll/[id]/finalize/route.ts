import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "payroll:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) return NextResponse.json({ message: "Payroll period not found" }, { status: 404 });
  if (period.status !== "DRAFT") {
    return NextResponse.json({ message: "Only a draft period can be finalized." }, { status: 409 });
  }

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: "FINALIZED", finalizedAt: new Date() },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "PAYROLL_FINALIZED",
    targetType: "PayrollPeriod",
    targetId: id,
    details: { month: period.month, year: period.year },
  });

  return NextResponse.json(updated);
}
