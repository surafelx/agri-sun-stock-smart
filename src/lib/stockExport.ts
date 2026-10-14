import * as XLSX from "xlsx";
import { items as itemsApi } from "@/lib/api";

export type ExportLayout = "summary" | "per-item" | "single-sheet";
export type TxType = "purchase" | "sale" | "transfer" | "adjustment";

export const TX_TYPES: { value: TxType; label: string }[] = [
  { value: "purchase", label: "Purchases" },
  { value: "sale", label: "Sales" },
  { value: "transfer", label: "Transfers" },
  { value: "adjustment", label: "Adjustments" },
];

export interface StockExportOptions {
  layout: ExportLayout;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  types: TxType[];
  itemIds?: string[]; // limit to these items (the ones on screen)
}

// Transaction dates are stored as midnight UTC of the day picked in the form
const dayOf = (d: string) => new Date(d).toISOString().slice(0, 10);
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const round2 = (n: number) => Math.round(n * 100) / 100;

// Excel sheet names: at most 31 characters, none of []:*?/\ and unique within the workbook
const sheetName = (raw: string, used: Set<string>) => {
  const base = raw.replace(/[[\]:*?/\\]/g, "-").trim().slice(0, 31) || "Item";
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)}~${n}`;
  used.add(name.toLowerCase());
  return name;
};

const MOVEMENT_HEADER = ["Date", "Type", "Reference", "Customer / Supplier", "From Purchase", "In", "Out", "Unit Price", "Value", "Balance"];

// A running balance only adds up when every type is listed; with some hidden it would jump, so it's left blank
const movementRow = (m: any, showBalance: boolean) => [
  new Date(m.date),
  capitalize(m.type),
  m.reference || "",
  m.customerSupplier || "",
  m.purchaseRef || "",
  (m.quantityIn || 0) + (m.adjustment || 0) || "",
  m.quantityOut || "",
  m.unitPrice ?? 0,
  round2((m.valueIn || 0) - (m.valueOut || 0)),
  showBalance ? m.balance : "",
];

// Splits an item's full ledger at the date range. Balances always come from every movement,
// so the type filter only hides rows and never changes opening or closing figures.
function periodOf(ledger: any, opts: StockExportOptions) {
  const { movements } = ledger;
  const before = movements.filter((m: any) => opts.from && dayOf(m.date) < opts.from);
  const inRange = movements.filter((m: any) => (!opts.from || dayOf(m.date) >= opts.from) && (!opts.to || dayOf(m.date) <= opts.to));
  const opening = before.length ? before[before.length - 1].balance : 0;
  const closing = inRange.length ? inRange[inRange.length - 1].balance : opening;
  const sum = (type: string, key: string) => inRange.filter((m: any) => m.type === type).reduce((s: number, m: any) => s + (m[key] || 0), 0);
  return {
    opening,
    closing,
    purchased: sum("purchase", "quantityIn"),
    sold: sum("sale", "quantityOut"),
    transferred: sum("transfer", "quantityOut"),
    adjusted: sum("adjustment", "adjustment"),
    listed: inRange.filter((m: any) => opts.types.includes(m.type)),
  };
}

export async function exportStock(opts: StockExportOptions) {
  const { ledgers } = await itemsApi.stockLedger();
  const wanted = opts.itemIds && new Set(opts.itemIds.map(String));
  const rows = ledgers
    .filter((l: any) => !wanted || wanted.has(String(l.item._id)))
    .map((l: any) => ({ item: l.item, ...periodOf(l, opts) }));

  const period = opts.from || opts.to
    ? `${opts.from ? fmtDay(opts.from) : "Start"} – ${opts.to ? fmtDay(opts.to) : "Today"}`
    : "All dates";
  const typeLabel = opts.types.length === TX_TYPES.length ? "All types"
    : TX_TYPES.filter((t) => opts.types.includes(t.value)).map((t) => t.label).join(", ");
  const hasPeriod = !!(opts.from || opts.to);
  const showBalance = opts.types.length === TX_TYPES.length;

  const wb = XLSX.utils.book_new();
  const used = new Set<string>(["summary"]);
  const detailSheets: [string, XLSX.WorkSheet][] = [];

  // Summary: reconciles as Opening + Purchased - Sold - Transferred + Adjusted = Closing
  const summaryHeader = ["No.", "SKU", "Item", "Category", "Subcategory", "UOM", "Opening", "Purchased", "Sold", "Transferred", "Adjusted", "Closing", "Cost Price", "Value at Cost"];
  const summary: any[][] = [
    ["Agrisun Ethiopia — Stock Summary"],
    [`Period: ${period}`],
    [`Exported ${new Date().toLocaleString()}`],
    [],
    opts.layout === "per-item" ? [...summaryHeader, "Sheet"] : summaryHeader,
  ];
  const sheetLinks: [number, string][] = [];

  rows.forEach((r: any, idx: number) => {
    const { item } = r;
    const line = [idx + 1, item.sku, item.name, item.category?.name || "", item.subcategory?.name || "", item.uom || "",
      r.opening, r.purchased, r.sold, r.transferred, r.adjusted, r.closing, round2(item.costPrice || 0), round2(r.closing * (item.costPrice || 0))];

    if (opts.layout === "per-item") {
      if (r.listed.length || (hasPeriod && r.opening)) {
        const name = sheetName(`${item.sku} ${item.name}`, used);
        sheetLinks.push([summary.length, name]);
        line.push(name);
        const aoa: any[][] = [
          [item.name],
          [`SKU: ${item.sku}`, `Category: ${item.category?.name || "-"}`, `UOM: ${item.uom || "-"}`],
          [`Period: ${period}`, `Types: ${typeLabel}`],
          [],
          MOVEMENT_HEADER,
          ...(hasPeriod ? [[opts.from ? new Date(`${opts.from}T00:00:00Z`) : "", "Opening balance", "", "", "", "", "", "", "", r.opening]] : []),
          ...r.listed.map((m: any) => movementRow(m, showBalance)),
          ["", "Closing balance", "", "", "", "", "", "", "", r.closing],
        ];
        const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: "dd-mmm-yyyy" });
        ws["!cols"] = [12, 15, 24, 24, 16, 9, 9, 11, 12, 10].map((wch) => ({ wch }));
        detailSheets.push([name, ws]);
      } else {
        line.push("No transactions");
      }
    }
    summary.push(line);
  });

  const totals = [6, 7, 8, 9, 10, 11, 13].map((c) => round2(summary.slice(5).reduce((s, l) => s + (Number(l[c]) || 0), 0)));
  summary.push(["", "", "TOTAL", "", "", "", ...totals.slice(0, 6), "", totals[6]]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summary);
  summaryWs["!cols"] = [5, 14, 32, 16, 16, 7, 10, 10, 10, 11, 10, 10, 11, 14, 32].map((wch) => ({ wch }));
  for (const [r, name] of sheetLinks) {
    const cell = summaryWs[XLSX.utils.encode_cell({ r, c: 14 })];
    if (cell) cell.l = { Target: `#'${name.replace(/'/g, "''")}'!A1`, Tooltip: "Open sheet" };
  }
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  if (opts.layout === "single-sheet") {
    // Every item's movements on one sheet, item by item, ready for Excel's filter buttons
    const aoa: any[][] = [["SKU", "Item", ...MOVEMENT_HEADER]];
    for (const r of rows) {
      if (!r.listed.length && !(hasPeriod && r.opening)) continue;
      if (hasPeriod) aoa.push([r.item.sku, r.item.name, opts.from ? new Date(`${opts.from}T00:00:00Z`) : "", "Opening balance", "", "", "", "", "", "", "", r.opening]);
      for (const m of r.listed) aoa.push([r.item.sku, r.item.name, ...movementRow(m, showBalance)]);
      aoa.push([r.item.sku, r.item.name, opts.to ? new Date(`${opts.to}T00:00:00Z`) : "", "Closing balance", "", "", "", "", "", "", "", r.closing]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: "dd-mmm-yyyy" });
    ws["!cols"] = [14, 28, 12, 15, 24, 24, 16, 9, 9, 11, 12, 10].map((wch) => ({ wch }));
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: 11 } }) };
    detailSheets.push(["All Transactions", ws]);
  }

  for (const [name, ws] of detailSheets) XLSX.utils.book_append_sheet(wb, ws, name);

  const base = { summary: "stock-summary", "per-item": "stock-ledger-by-item", "single-sheet": "stock-ledger" }[opts.layout];
  const range = hasPeriod ? `${opts.from || "start"}_to_${opts.to || "today"}` : new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${base}-${range}.xlsx`);
  return { items: rows.length, sheets: wb.SheetNames.length };
}
