import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime } from "@/lib/utils";
import { toCsvRow } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), 0, 1);
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const visitors = await prisma.visitor.findMany({
    where: { timeIn: { gte: from, lte: to } },
    orderBy: { timeIn: "asc" },
  });

  const header = ["Full name", "Phone", "Organization", "Category", "Purpose", "Person to see", "Badge #", "Time in", "Time out", "Voided", "Void reason"];
  const csvLines = [
    toCsvRow(header),
    ...visitors.map((v) =>
      toCsvRow([
        v.fullName,
        v.phone,
        v.organization,
        v.category,
        v.purposeOfVisit,
        v.personToSee,
        v.badgeNumber,
        `${formatDate(v.timeIn)} ${formatTime(v.timeIn)}`,
        v.timeOut ? `${formatDate(v.timeOut)} ${formatTime(v.timeOut)}` : "",
        v.voided ? "Yes" : "No",
        v.voidReason,
      ]),
    ),
  ];

  const rangeLabel = `${formatDate(from)}_to_${formatDate(to)}`.replace(/[\s,]/g, "");

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="visitors-${rangeLabel}.csv"`,
    },
  });
}
