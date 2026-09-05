import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const respondSchema = z.object({ response: z.string().min(1, "Please write a response.") });

// A staff member responding to their own query — deliberately not gated by
// permissions.ts at all, since the only person who should ever be able to
// do this is the query's subject, checked directly below via staffId.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const query = await prisma.staffQuery.findUnique({ where: { id } });
  if (!query) return NextResponse.json({ message: "Query not found" }, { status: 404 });

  const staffId = (session.user as { staffId?: string | null }).staffId;
  if (!staffId || staffId !== query.staffId) {
    return NextResponse.json({ message: "You can only respond to your own queries." }, { status: 403 });
  }

  if (query.status !== "PENDING_RESPONSE") {
    return NextResponse.json({ message: "This query has already been responded to." }, { status: 409 });
  }

  const parsed = respondSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid response." }, { status: 422 });
  }

  const updated = await prisma.staffQuery.update({
    where: { id },
    data: { staffResponse: parsed.data.response, respondedAt: new Date(), status: "RESPONDED" },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "STAFF_QUERY_RESPONDED",
    targetType: "Staff",
    targetId: query.staffId,
    details: { queryId: query.id },
  });

  return NextResponse.json(updated);
}
