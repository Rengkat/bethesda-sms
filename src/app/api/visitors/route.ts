import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createVisitorSchema = z.object({
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
});

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
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const visitor = await prisma.visitor.create({
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

  return NextResponse.json(visitor, { status: 201 });
}
