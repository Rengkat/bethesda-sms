import * as XLSX from "xlsx";

/**
 * Builds a single-sheet .xlsx file buffer from an array of plain row
 * objects — the object keys become the header row, in insertion order.
 * Used wherever a spreadsheet (not CSV) is specifically wanted, e.g. for
 * a payroll export that finance will open directly in Excel.
 */
export function buildXlsxBuffer(sheetName: string, rows: Record<string, string | number>[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
