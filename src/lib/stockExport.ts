// The styling fork of SheetJS: same API, but it writes cell styles (borders, fills, bold)
import * as XLSX from "xlsx-js-style";
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

// Look of the sheets: shaded bold headers, thin borders on every table cell,
// and a grey band between items on the single-sheet layout
type RowKind = "title" | "meta" | "blank" | "header" | "data" | "total" | "separator";
const THIN = { style: "thin", color: { rgb: "A6A6A6" } };
const GRID = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const ROW_STYLES: Record<RowKind, any> = {
  title: { font: { bold: true, sz: 14 } },
  meta: { font: { color: { rgb: "595959" } } },
  blank: {},
  header: { font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "DDEBF7" } }, border: GRID, alignment: { vertical: "center" } },
  data: { border: GRID },
  total: { font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "F2F2F2" } }, border: GRID },
  separator: { fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } } },
};
const QTY = "General";
const MONEY = "#,##0.00";
const DATE = "dd-mmm-yyyy";

// Builds a sheet from rows plus what each row is, styling every cell of the table width
// (empty ones too, so borders and bands run unbroken). numFmts maps column -> number format.
function styledSheet(aoa: any[][], kinds: RowKind[], width: number, numFmts: Record<number, string>, cols: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: DATE });
  kinds.forEach((kind, r) => {
    const isTable = kind !== "title" && kind !== "meta" && kind !== "blank";
    for (let c = 0; c < (isTable ? width : aoa[r]?.length || 0); c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      // Outside tables, leave gaps empty so long text can overflow into them
      if (!ws[ref] && !isTable) continue;
      const cell = ws[ref] || (ws[ref] = { t: "s", v: "" });
      const style = { ...ROW_STYLES[kind] };
      if (cell.t === "d") style.numFmt = DATE;
      else if (cell.t === "n" && numFmts[c] && kind !== "header") style.numFmt = numFmts[c];
      cell.s = style;
    }
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: width - 1 } });
  ws["!cols"] = cols.map((wch) => ({ wch }));
  return ws;
}

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
  // Movement columns: Date, Type, Reference, Customer, From Purchase, In, Out, Unit Price, Value, Balance
  const movementFmts = { 5: QTY, 6: QTY, 7: MONEY, 8: MONEY, 9: QTY };
  const openingRow = (r: any) => [opts.from ? new Date(`${opts.from}T00:00:00Z`) : "", "Opening balance", "", "", "", "", "", "", "", r.opening];
  const closingRow = (r: any) => [opts.to ? new Date(`${opts.to}T00:00:00Z`) : "", "Closing balance", "", "", "", "", "", "", "", r.closing];

  // Summary: reconciles as Opening + Purchased - Sold - Transferred + Adjusted = Closing
  const summaryHeader = ["No.", "SKU", "Item", "Category", "Subcategory", "UOM", "Opening", "Purchased", "Sold", "Transferred", "Adjusted", "Closing", "Cost Price", "Value at Cost"];
  if (opts.layout === "per-item") summaryHeader.push("Sheet");
  const summary: any[][] = [
    ["Agrisun Ethiopia — Stock Summary"],
    [`Period: ${period}`],
    [`Exported ${new Date().toLocaleString()}`],
    [],
    summaryHeader,
  ];
  const summaryKinds: RowKind[] = ["title", "meta", "meta", "blank", "header"];
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
          [`Period: ${period}`, null, null, `Types: ${typeLabel}`], // gaps let the period text run across
          [],
          MOVEMENT_HEADER,
          ...(hasPeriod ? [openingRow(r)] : []),
          ...r.listed.map((m: any) => movementRow(m, showBalance)),
          closingRow(r),
        ];
        const kinds: RowKind[] = ["title", "meta", "meta", "blank", "header", ...aoa.slice(5).map((): RowKind => "data")];
        detailSheets.push([name, styledSheet(aoa, kinds, MOVEMENT_HEADER.length, movementFmts, [12, 15, 24, 24, 16, 9, 9, 11, 12, 10])]);
      } else {
        line.push("No transactions");
      }
    }
    summary.push(line);
    summaryKinds.push("data");
  });

  const totals = [6, 7, 8, 9, 10, 11, 13].map((c) => round2(summary.slice(5).reduce((sum, l) => sum + (Number(l[c]) || 0), 0)));
  summary.push(["", "", "TOTAL", "", "", "", ...totals.slice(0, 6), "", totals[6]]);
  summaryKinds.push("total");

  const summaryWs = styledSheet(summary, summaryKinds, summaryHeader.length,
    { 6: QTY, 7: QTY, 8: QTY, 9: QTY, 10: QTY, 11: QTY, 12: MONEY, 13: MONEY },
    [5, 14, 32, 16, 16, 7, 10, 10, 10, 11, 10, 10, 11, 14, 32]);
  for (const [r, name] of sheetLinks) {
    const cell = summaryWs[XLSX.utils.encode_cell({ r, c: 14 })];
    if (cell) {
      cell.l = { Target: `#'${name.replace(/'/g, "''")}'!A1`, Tooltip: "Open sheet" };
      cell.s = { ...cell.s, font: { color: { rgb: "0563C1" }, underline: true } };
    }
  }
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  if (opts.layout === "single-sheet") {
    // Every item on one sheet as its own block: header, transactions, closing balance, then a grey band
    const header = ["SKU", "Item", ...MOVEMENT_HEADER];
    const aoa: any[][] = [];
    const kinds: RowKind[] = [];
    for (const r of rows) {
      if (!r.listed.length && !(hasPeriod && r.opening)) continue;
      if (aoa.length) { aoa.push([]); kinds.push("separator"); }
      const block = [
        header,
        ...(hasPeriod ? [openingRow(r)] : []),
        ...r.listed.map((m: any) => movementRow(m, showBalance)),
        closingRow(r),
      ];
      block.forEach((row, i) => {
        aoa.push(i === 0 ? row : [r.item.sku, r.item.name, ...row]);
        kinds.push(i === 0 ? "header" : "data");
      });
    }
    if (!aoa.length) { aoa.push(header); kinds.push("header"); }
    const fmts = Object.fromEntries(Object.entries(movementFmts).map(([c, f]) => [Number(c) + 2, f]));
    const ws = styledSheet(aoa, kinds, header.length, fmts, [14, 28, 12, 15, 24, 24, 16, 9, 9, 11, 12, 10]);
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: header.length - 1 } }) };
    detailSheets.push(["All Transactions", ws]);
  }

  for (const [name, ws] of detailSheets) XLSX.utils.book_append_sheet(wb, ws, name);

  const base = { summary: "stock-summary", "per-item": "stock-ledger-by-item", "single-sheet": "stock-ledger" }[opts.layout];
  const range = hasPeriod ? `${opts.from || "start"}_to_${opts.to || "today"}` : new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `${base}-${range}.xlsx`);
  return { items: rows.length, sheets: wb.SheetNames.length };
}
