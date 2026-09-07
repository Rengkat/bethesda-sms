import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsvToObjects } from "@/lib/csv";

const VALID_CATEGORIES = new Set([
  "GENERAL",
  "PARENT_GUARDIAN",
  "VENDOR_SUPPLIER",
  "GOVERNMENT_OFFICIAL",
  "DONOR_PARTNER",
  "VOLUNTEER_PROSPECT",
  "OTHER",
]);

/**
 * Bulk-imports visitor entries from a CSV matching /api/visitors/template.
 * Every row still goes through registeredBy attribution (the importing
 * user), same as a manually logged entry — bulk import isn't a way around
 * that trail, just a faster way to create it (e.g. backfilling a paper
 * sign-in book).
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please choose a CSV file." }, { status: 422 });
  }

  const text = await file.text();
  const rows = parseCsvToObjects(text).filter((r) => r.fullName && !r.fullName.startsWith("#"));

  if (rows.length === 0) {
    return NextResponse.json({ message: "No valid rows found in that file." }, { status: 422 });
  }

  const errors: string[] = [];
  const toCreate: Array<Parameters<typeof prisma.visitor.create>[0]["data"]> = [];

  rows.forEach((row, i) => {
    const lineNo = i + 2; // +1 for header, +1 for 1-indexing
    if (!row.fullName?.trim()) {
      errors.push(`Row ${lineNo}: missing fullName`);
      return;
    }
    if (!row.purposeOfVisit?.trim() || !row.personToSee?.trim()) {
      errors.push(`Row ${lineNo}: missing purposeOfVisit or personToSee`);
      return;
    }
    const category = row.category?.trim().toUpperCase();
    if (category && !VALID_CATEGORIES.has(category)) {
      errors.push(`Row ${lineNo}: invalid category "${row.category}"`);
      return;
    }

    toCreate.push({
      fullName: row.fullName.trim(),
      phone: row.phone || null,
      organization: row.organization || null,
      category: (category as never) || "GENERAL",
      purposeOfVisit: row.purposeOfVisit.trim(),
      personToSee: row.personToSee.trim(),
      badgeNumber: row.badgeNumber || null,
      notes: row.notes || null,
      registeredBy: session.user.id,
    });
  });

  if (toCreate.length > 0) {
    await prisma.visitor.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length, skipped: errors.length, errors: errors.slice(0, 20) });
}
