import * as XLSX from "xlsx";
import { items as itemsApi } from "@/lib/api";

// Excel sheet names: at most 31 characters, none of []:*?/\ and unique within the workbook
const sheetName = (raw: string, used: Set<string>) => {
  const base = raw.replace(/[[\]:*?/\\]/g, "-").trim().slice(0, 31) || "Item";
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)}~${n}`;
  used.add(name.toLowerCase());
  return name;
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

// One workbook: a Summary sheet, then one sheet per item with its movements in date order.
// itemIds limits it to the items on screen; items without movements appear only in the summary.
export async function exportStockLedger(fileName: string, itemIds?: string[]) {
  const { ledgers } = await itemsApi.stockLedger();
  const wanted = itemIds && new Set(itemIds.map(String));
  const rows = ledgers.filter((l: any) => !wanted || wanted.has(String(l.item._id)));

  const wb = XLSX.utils.book_new();
  const used = new Set<string>(["summary"]);
  const summary: any[][] = [
    ["Agrisun Ethiopia — Stock Ledger"],
    [`Exported ${new Date().toLocaleString()}`],
    [],
    ["No.", "SKU", "Item", "Category", "UOM", "Total In", "Total Out", "Closing Balance", "Sheet"],
  ];
  const itemSheets: [string, XLSX.WorkSheet][] = [];

  rows.forEach((l: any, idx: number) => {
    const { item, movements, currentBalance } = l;
    const totalIn = movements.reduce((s: number, m: any) => s + (m.quantityIn || 0) + (m.adjustment || 0), 0);
    const totalOut = movements.reduce((s: number, m: any) => s + (m.quantityOut || 0), 0);
    const name = movements.length ? sheetName(`${item.sku} ${item.name}`, used) : "";
    summary.push([idx + 1, item.sku, item.name, item.category?.name || "", item.uom || "", totalIn, totalOut, currentBalance, name || "No transactions"]);
    if (!name) return;

    const aoa: any[][] = [
      [item.name],
      [`SKU: ${item.sku}`, `Category: ${item.category?.name || "-"}`, `UOM: ${item.uom || "-"}`],
      [],
      ["Date", "Type", "Reference", "Customer / Supplier", "From Purchase", "In", "Out", "Unit Price", "Value", "Balance"],
      ...movements.map((m: any) => [
        new Date(m.date),
        capitalize(m.type),
        m.reference || "",
        m.customerSupplier || "",
        m.purchaseRef || "",
        (m.quantityIn || 0) + (m.adjustment || 0) || "",
        m.quantityOut || "",
        m.unitPrice ?? 0,
        Number(((m.valueIn || 0) - (m.valueOut || 0)).toFixed(2)),
        m.balance,
      ]),
      ["", "", "", "", "TOTAL", totalIn, totalOut, "", "", currentBalance],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: "dd-mmm-yyyy" });
    ws["!cols"] = [12, 11, 24, 24, 16, 9, 9, 11, 12, 10].map((wch) => ({ wch }));
    itemSheets.push([name, ws]);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summary);
  summaryWs["!cols"] = [5, 14, 32, 16, 7, 10, 10, 15, 32].map((wch) => ({ wch }));
  // Sheet names in the summary link to their sheets
  summary.slice(4).forEach((r, i) => {
    if (r[8] === "No transactions") return;
    const cell = summaryWs[XLSX.utils.encode_cell({ r: i + 4, c: 8 })];
    if (cell) cell.l = { Target: `#'${String(r[8]).replace(/'/g, "''")}'!A1`, Tooltip: `Open ${r[2]}` };
  });

  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");
  for (const [name, ws] of itemSheets) XLSX.utils.book_append_sheet(wb, ws, name);
  XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split("T")[0]}.xlsx`);
  return { items: rows.length, sheets: itemSheets.length };
}
