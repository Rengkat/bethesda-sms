import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { parseCsvToObjects } from "@/lib/csv";

const DONOR_TYPES = new Set(["INDIVIDUAL", "ORGANIZATION", "CHURCH_FAITH_BASED", "GOVERNMENT", "OTHER"]);
const DONATION_TYPES = new Set(["CASH", "BANK_TRANSFER", "CHEQUE", "IN_KIND"]);

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please choose a CSV file." }, { status: 422 });
  }

  const text = await file.text();
  const rows = parseCsvToObjects(text).filter((r) => r.donorName && !r.donorName.startsWith("#"));

  if (rows.length === 0) {
    return NextResponse.json({ message: "No valid rows found in that file." }, { status: 422 });
  }

  const errors: string[] = [];
  const toCreate: Array<Parameters<typeof prisma.donation.create>[0]["data"]> = [];

  rows.forEach((row, i) => {
    const lineNo = i + 2;
    const donorType = row.donorType?.trim().toUpperCase();
    const donationType = row.donationType?.trim().toUpperCase();

    if (!row.donorName?.trim()) {
      errors.push(`Row ${lineNo}: missing donorName`);
      return;
    }
    if (!donationType || !DONATION_TYPES.has(donationType)) {
      errors.push(`Row ${lineNo}: invalid or missing donationType "${row.donationType}"`);
      return;
    }
    if (donationType !== "IN_KIND" && !row.amount) {
      errors.push(`Row ${lineNo}: amount is required unless donationType is IN_KIND`);
      return;
    }
    if (!row.donatedAt || Number.isNaN(new Date(row.donatedAt).getTime())) {
      errors.push(`Row ${lineNo}: invalid donatedAt date "${row.donatedAt}" (use YYYY-MM-DD)`);
      return;
    }

    toCreate.push({
      donorName: row.donorName.trim(),
      donorType: (DONOR_TYPES.has(donorType) ? donorType : "INDIVIDUAL") as never,
      donorContact: row.donorContact || null,
      donationType: donationType as never,
      amount: donationType === "IN_KIND" ? null : row.amount,
      inKindDescription: row.inKindDescription || null,
      purpose: row.purpose || null,
      receiptNumber: row.receiptNumber || null,
      donatedAt: new Date(row.donatedAt),
      recordedBy: session.user.id,
      notes: row.notes || null,
    });
  });

  if (toCreate.length > 0) {
    await prisma.donation.createMany({ data: toCreate });
  }

  return NextResponse.json({ created: toCreate.length, skipped: errors.length, errors: errors.slice(0, 20) });
}
