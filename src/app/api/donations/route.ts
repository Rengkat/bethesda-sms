import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const createDonationSchema = z
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

// Donations carry donor contact detail and financial figures, so both
// reading and writing are gated behind "donations:manage" — unlike
// Visitors, this isn't a general front-desk task.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const donations = await prisma.donation.findMany({
    include: { receivedBy: true },
    orderBy: { donatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json(donations);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = createDonationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const donation = await prisma.donation.create({
    data: {
      donorName: data.donorName,
      donorType: data.donorType,
      donorContact: data.donorContact || undefined,
      donationType: data.donationType,
      amount: data.donationType === "IN_KIND" ? undefined : data.amount,
      inKindDescription: data.inKindDescription || undefined,
      purpose: data.purpose || undefined,
      receiptNumber: data.receiptNumber || undefined,
      donatedAt: new Date(data.donatedAt),
      receivedById: data.receivedById,
      notes: data.notes || undefined,
    },
  });

  await writeAuditLog({
    actorId: session.user.id,
    action: "DONATION_LOGGED",
    targetType: "Donation",
    targetId: donation.id,
    details: { donorName: donation.donorName, donationType: donation.donationType },
  });

  return NextResponse.json(donation, { status: 201 });
}
