import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const recordDonationSchema = z
  .object({
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION", "CHURCH_FAITH_BASED", "GOVERNMENT", "OTHER"]),
    donationType: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "IN_KIND"]),
    amount: z.string().optional().or(z.literal("")),
    inKindDescription: z.string().optional().or(z.literal("")),
    purpose: z.string().optional().or(z.literal("")),
    receiptNumber: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.donationType === "IN_KIND" || Boolean(data.amount), {
    message: "An amount is required unless this is an in-kind donation.",
    path: ["amount"],
  });

/**
 * Records a donation for an existing Visitor entry — the "they decided
 * to donate after all" case, as opposed to capturing it inline at
 * registration (see /api/visitors POST). Deliberately not gated behind
 * donations:manage, same reasoning as that inline path: logging a
 * donation at the point of contact is a front-desk capture action, not
 * the financial-management access the Donations page itself protects
 * (viewing the full list, editing, voiding stay restricted there).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: visitorId } = await params;
  const visitor = await prisma.visitor.findUnique({ where: { id: visitorId } });
  if (!visitor) return NextResponse.json({ message: "Visitor not found" }, { status: 404 });

  const parsed = recordDonationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const donation = await prisma.donation.create({
    data: {
      donorName: visitor.fullName,
      donorType: data.donorType,
      donorContact: visitor.phone || undefined,
      donationType: data.donationType,
      amount: data.donationType === "IN_KIND" ? undefined : data.amount,
      inKindDescription: data.inKindDescription || undefined,
      purpose: data.purpose || undefined,
      receiptNumber: data.receiptNumber || undefined,
      recordedBy: session.user.id,
      visitorId: visitor.id,
    },
  });

  return NextResponse.json(donation, { status: 201 });
}
