import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatDate, formatTime } from "@/lib/utils";
import { csvEscape } from "@/lib/csv";
import { renderAttendanceReportPdf } from "@/lib/pdf-report";

/**
 * GET /api/staff/[id]/attendance/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|pdf
 *
 * A single staff member's own attendance in a date range — distinct from
 * /api/reports/export, which covers everyone. Any signed-in user can
 * export their OWN attendance; exporting someone else's requires
 * reports:export (the same permission that gates the org-wide reports).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id: staffId } = await params;
  const role = (session.user as { role?: string }).role;
  const ownStaffId = (session.user as { staffId?: string | null }).staffId;

  const isOwnRecord = ownStaffId === staffId;
  if (!isOwnRecord && (!role || !can(role as never, "reports:export"))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { department: true } });
  if (!staff) return NextResponse.json({ message: "Staff member not found" }, { status: 404 });

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  const from = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), 0, 1);
  // Include the whole "to" day, not just its midnight instant.
  const to = toParam ? new Date(toParam) : new Date();
  to.setHours(23, 59, 59, 999);

  const attendances = await prisma.attendance.findMany({
    where: { staffId, timestamp: { gte: from, lte: to } },
    orderBy: { timestamp: "asc" },
    include: { device: true },
  });

  const rangeLabel = `${formatDate(from)}_to_${formatDate(to)}`.replace(/[\s,]/g, "");

  if (format === "pdf") {
    const pdfBuffer = await renderAttendanceReportPdf({
      title: `Attendance — ${staff.fullName} (${formatDate(from)} to ${formatDate(to)})`,
      rows: attendances.map((a) => ({
        staffName: staff.fullName,
        departmentName: staff.department.name,
        timestamp: a.timestamp,
        type: a.type,
        status: a.status,
      })),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${staff.staffCode}-attendance-${rangeLabel}.pdf"`,
      },
    });
  }

  const header = ["Date", "Time", "Type", "Status", "Source", "Device"];
  const csvLines = [
    header.join(","),
    ...attendances.map((a) =>
      [
        formatDate(a.timestamp),
        formatTime(a.timestamp),
        a.type,
        a.status,
        a.source,
        csvEscape(a.device.name),
      ].join(","),
    ),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${staff.staffCode}-attendance-${rangeLabel}.csv"`,
    },
  });
}
