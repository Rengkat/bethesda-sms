import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createVisitorSchema = z
  .object({
    fullName: z.string().min(1),
    phone: z.string().optional().or(z.literal("")),
    organization: z.string().optional().or(z.literal("")),
    category: z.enum([
      "GENERAL",
      "PARENT_GUARDIAN",
      "VENDOR_SUPPLIER",
      "GOVERNMENT_OFFICIAL",
      "DONOR_PARTNER",
      "VOLUNTEER_PROSPECT",
      "OTHER",
    ]),
    purposeOfVisit: z.string().min(1),
    personToSee: z.string().min(1),
    badgeNumber: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),

    // Optional — most visitors here are donors or prospective donors, so
    // a donation can be logged in the same step instead of a second trip
    // to the Donations page. See the schema comment on Visitor.donations.
    madeDonation: z.union([z.literal("on"), z.literal("true")]).optional(),
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION", "CHURCH_FAITH_BASED", "GOVERNMENT", "OTHER"]).optional(),
    donationType: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "IN_KIND"]).optional(),
    amount: z.string().optional().or(z.literal("")),
    inKindDescription: z.string().optional().or(z.literal("")),
    purpose: z.string().optional().or(z.literal("")),
    receiptNumber: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      !(data.madeDonation === "on" || data.madeDonation === "true") ||
      Boolean(data.donationType && (data.donationType === "IN_KIND" || data.amount)),
    { message: "Donation type is required, and an amount unless it's in-kind.", path: ["donationType"] },
  );

// Deliberately no `can()` gate on GET/POST here — logging a visitor is a
// front-desk task any signed-in staff member may need to do, not an
// HR/admin-only action. Every write still requires a session (auth check
// below) and is attributed to session.user.id via `registeredBy`.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const visitors = await prisma.visitor.findMany({
    orderBy: { timeIn: "desc" },
    take: 100,
  });
  return NextResponse.json(visitors);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = createVisitorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const madeDonation = data.madeDonation === "on" || data.madeDonation === "true";

  const visitor = await prisma.$transaction(async (tx) => {
    const created = await tx.visitor.create({
      data: {
        fullName: data.fullName,
        phone: data.phone || undefined,
        organization: data.organization || undefined,
        category: data.category,
        purposeOfVisit: data.purposeOfVisit,
        personToSee: data.personToSee,
        badgeNumber: data.badgeNumber || undefined,
        notes: data.notes || undefined,
        registeredBy: session.user.id,
      },
    });

    if (madeDonation && data.donationType) {
      await tx.donation.create({
        data: {
          donorName: data.fullName,
          donorType: data.donorType ?? "INDIVIDUAL",
          donorContact: data.phone || undefined,
          donationType: data.donationType,
          amount: data.donationType === "IN_KIND" ? undefined : data.amount,
          inKindDescription: data.inKindDescription || undefined,
          purpose: data.purpose || undefined,
          receiptNumber: data.receiptNumber || undefined,
          recordedBy: session.user.id,
          visitorId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(visitor, { status: 201 });
}
