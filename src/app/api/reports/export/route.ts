import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatDate, formatTime } from "@/lib/utils";
import { csvEscape } from "@/lib/csv";
import { renderAttendanceReportPdf } from "@/lib/pdf-report";

const REPORT_TITLES: Record<string, string> = {
  "attendance-summary": "Attendance Summary",
  "lateness-trend": "Lateness Trend",
};

/**
 * GET /api/reports/export?report=attendance-summary|lateness-trend&format=csv|pdf
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !can(role as never, "reports:export")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const report = req.nextUrl.searchParams.get("report") ?? "attendance-summary";
  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  // With no range given, keep the previous "last 1000 records" safety cap
  // (avoids accidentally exporting the whole table on a large deployment).
  // A specified range is inherently bounded, so it isn't capped — a school
  // year of attendance for even a large staff won't blow past what
  // pdfkit/CSV can handle here.
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (fromParam || toParam) {
    dateFilter = {};
    if (fromParam) dateFilter.gte = new Date(fromParam);
    if (toParam) {
      const to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
      dateFilter.lte = to;
    }
  }

  const attendances = await prisma.attendance.findMany({
    where: dateFilter ? { timestamp: dateFilter } : undefined,
    include: { staff: { include: { department: true } } },
    orderBy: { timestamp: "desc" },
    ...(dateFilter ? {} : { take: 1000 }),
  });

  const rows =
    report === "lateness-trend"
      ? attendances.filter((a) => a.status === "LATE" || a.status === "EARLY_DEPARTURE")
      : attendances;

  const rangeSuffix = fromParam || toParam ? `_${fromParam ?? "start"}_to_${toParam ?? "now"}` : "";

  if (format === "pdf") {
    const pdfBuffer = await renderAttendanceReportPdf({
      title:
        (REPORT_TITLES[report] ?? "Attendance Report") +
        (fromParam || toParam ? ` (${fromParam ?? "…"} to ${toParam ?? "…"})` : ""),
      rows: rows.map((a) => ({
        staffName: a.staff.fullName,
        departmentName: a.staff.department.name,
        timestamp: a.timestamp,
        type: a.type,
        status: a.status,
      })),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report}${rangeSuffix}.pdf"`,
      },
    });
  }

  const header = ["Staff", "Department", "Date", "Time", "Type", "Status"];
  const csvLines = [
    header.join(","),
    ...rows.map((a) =>
      [
        csvEscape(a.staff.fullName),
        csvEscape(a.staff.department.name),
        formatDate(a.timestamp),
        formatTime(a.timestamp),
        a.type,
        a.status,
      ].join(","),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${report}${rangeSuffix}.csv"`,
    },
  });
}
