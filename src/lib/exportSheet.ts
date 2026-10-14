import * as XLSX from "xlsx";

// Writes rows (one object per row, keys become headers) to an .xlsx download,
// with columns sized to their longest value
export function exportSheet(fileName: string, sheetName: string, rows: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] || {});
  ws["!cols"] = headers.map((h) => ({
    wch: Math.min(50, Math.max(h.length, ...rows.map((r) => String(r[h] ?? "").length)) + 2),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split("T")[0]}.xlsx`);
}
