import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const updateDonationSchema = z
  .object({
    donorName: z.string().min(1),
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION", "CHURCH_FAITH_BASED", "GOVERNMENT", "OTHER"]),
    donorContact: z.string().optional().or(z.literal("")),
    donationType: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "IN_KIND"]),
    amount: z.string().optional().or(z.literal("")),
    inKindDescription: z.string().optional().or(z.literal("")),
    purpose: z.string().optional().or(z.literal("")),
    receiptNumber: z.string().optional().or(z.literal("")),
    donatedAt: z.string().min(1),
    receivedById: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.donationType === "IN_KIND" || Boolean(data.amount), {
    message: "An amount is required unless this is an in-kind donation.",
    path: ["amount"],
  });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.donation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Donation not found" }, { status: 404 });
  if (existing.voided) {
    return NextResponse.json({ message: "This donation has been voided and can't be edited." }, { status: 409 });
  }

  const parsed = updateDonationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.donation.update({
    where: { id },
    data: {
      donorName: data.donorName,
      donorType: data.donorType,
      donorContact: data.donorContact || null,
      donationType: data.donationType,
      amount: data.donationType === "IN_KIND" ? null : data.amount,
      inKindDescription: data.inKindDescription || null,
      purpose: data.purpose || null,
      receiptNumber: data.receiptNumber || null,
      donatedAt: new Date(data.donatedAt),
      receivedById: data.receivedById,
      notes: data.notes || null,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "DONATION_EDITED",
    targetType: "Donation",
    targetId: updated.id,
    details: { donorName: updated.donorName },
  });

  return NextResponse.json(updated);
}
