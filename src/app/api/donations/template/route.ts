import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { toCsvRow } from "@/lib/csv";

const HEADER = [
  "donorName", "donorType", "donorContact", "donationType", "amount",
  "inKindDescription", "purpose", "receiptNumber", "donatedAt", "notes",
];
const EXAMPLE = [
  "Chinedu Eze", "INDIVIDUAL", "08099998888", "BANK_TRANSFER", "50000",
  "", "Feeding programme", "RCP-2044", "2026-03-04", "Monthly standing order",
];
const NOTES = [
  "# donorType: INDIVIDUAL, ORGANIZATION, CHURCH_FAITH_BASED, GOVERNMENT, OTHER",
  "# donationType: CASH, BANK_TRANSFER, CHEQUE, IN_KIND",
  "# amount is required unless donationType is IN_KIND (use inKindDescription instead)",
  "# donatedAt format: YYYY-MM-DD",
  "# delete the example row and these notes before importing",
];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const csv = [toCsvRow(HEADER), toCsvRow(EXAMPLE), "", ...NOTES].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="donation-import-template.csv"',
    },
  });
}
