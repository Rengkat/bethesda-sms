import PDFDocument from "pdfkit";
import { formatDate, formatTime } from "@/lib/utils";

type ReportRow = {
  staffName: string;
  departmentName: string;
  timestamp: Date;
  type: string;
  status: string;
};

const BRAND_BLUE = "#2f3fe0";
const MUTED = "#667085";

/**
 * Renders a simple letterhead-style attendance report table to a PDF
 * buffer. Deliberately plain — donor/board reports need to be printable
 * and legible, not decorative.
 */
export async function renderAttendanceReportPdf(input: {
  title: string;
  rows: ReportRow[];
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Letterhead
  doc
    .fillColor(BRAND_BLUE)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Bethesda Home & School for the Blind", { continued: false });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text("20 Odejayi Crescent, Idi Oro, Lagos State");

  doc.moveDown(1.5);
  doc.fillColor("#16161d").fontSize(13).font("Helvetica-Bold").text(input.title);
  doc.fillColor(MUTED).fontSize(9).text(`Generated ${formatDate(new Date())}`);
  doc.moveDown(1);

  // Table header
  const startX = doc.x;
  const colWidths = [140, 110, 80, 60, 90];
  const headers = ["Staff", "Department", "Date", "Time", "Status"];

  function drawRow(cells: string[], opts: { header?: boolean } = {}) {
    const y = doc.y;
    doc.font(opts.header ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(opts.header ? "#16161d" : "#344054");
    let x = startX;
    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: colWidths[i], ellipsis: true });
      x += colWidths[i];
    });
    doc.moveDown(0.6);
  }

  drawRow(headers, { header: true });
  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), doc.y)
    .strokeColor("#e4e6ec")
    .stroke();
  doc.moveDown(0.3);

  for (const row of input.rows) {
    if (doc.y > 760) {
      doc.addPage();
    }
    drawRow([
      row.staffName,
      row.departmentName,
      formatDate(row.timestamp),
      formatTime(row.timestamp),
      row.status.replace("_", " "),
    ]);
  }

  if (input.rows.length === 0) {
    doc.fillColor(MUTED).fontSize(9).text("No records in range.");
  }

  doc.end();
  return done;
}
