import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateVisitorSchema = z.object({
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

// Editing stays as open as creating a visitor entry (see the reasoning in
// src/app/api/visitors/route.ts) — fixing a misspelled name shouldn't need
// an admin. Voiding, which is the more consequential action, lives in
// ./void/route.ts behind "visitors:void" instead.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.visitor.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ message: "Visitor not found" }, { status: 404 });
  if (existing.voided) {
    return NextResponse.json({ message: "This entry has been voided and can't be edited." }, { status: 409 });
  }

  const parsed = updateVisitorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Please check the form for errors.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.visitor.update({
    where: { id },
    data: {
      fullName: data.fullName,
      phone: data.phone || null,
      organization: data.organization || null,
      category: data.category,
      purposeOfVisit: data.purposeOfVisit,
      personToSee: data.personToSee,
      badgeNumber: data.badgeNumber || null,
      notes: data.notes || null,
    },
  });

  return NextResponse.json(updated);
}
