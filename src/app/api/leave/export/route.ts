import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { toCsvRow } from "@/lib/csv";

// Matches the leave list page's own access model (any signed-in user can
// view the leave register) — no extra gate beyond authentication.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), 0, 1);
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const requests = await prisma.leaveRequest.findMany({
    where: { startDate: { gte: from, lte: to } },
    include: { staff: true, leaveType: true },
    orderBy: { startDate: "asc" },
  });

  const header = ["Staff", "Staff code", "Leave type", "Start", "End", "Status", "Reason", "Requested on", "Decided on"];
  const csvLines = [
    toCsvRow(header),
    ...requests.map((r) =>
      toCsvRow([
        r.staff.fullName,
        r.staff.staffCode,
        r.leaveType.name,
        formatDate(r.startDate),
        formatDate(r.endDate),
        r.status,
        r.reason,
        formatDate(r.createdAt),
        r.decidedAt ? formatDate(r.decidedAt) : "",
      ]),
    ),
  ];

  const rangeLabel = `${formatDate(from)}_to_${formatDate(to)}`.replace(/[\s,]/g, "");

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leave-${rangeLabel}.csv"`,
    },
  });
}
