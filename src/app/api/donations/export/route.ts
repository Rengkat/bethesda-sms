import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { toCsvRow } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "donations:manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), 0, 1);
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const donations = await prisma.donation.findMany({
    where: { donatedAt: { gte: from, lte: to } },
    orderBy: { donatedAt: "asc" },
  });

  const header = [
    "Donor name", "Donor type", "Donor contact", "Donation type", "Amount",
    "In-kind description", "Purpose", "Receipt #", "Date", "Voided", "Void reason",
  ];
  const csvLines = [
    toCsvRow(header),
    ...donations.map((d) =>
      toCsvRow([
        d.donorName,
        d.donorType,
        d.donorContact,
        d.donationType,
        d.amount?.toString() ?? "",
        d.inKindDescription,
        d.purpose,
        d.receiptNumber,
        formatDate(d.donatedAt),
        d.voided ? "Yes" : "No",
        d.voidReason,
      ]),
    ),
  ];

  const rangeLabel = `${formatDate(from)}_to_${formatDate(to)}`.replace(/[\s,]/g, "");

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="donations-${rangeLabel}.csv"`,
    },
  });
}
