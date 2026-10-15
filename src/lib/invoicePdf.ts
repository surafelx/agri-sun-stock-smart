import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";

// Brand green (--primary) and the greys used across the documents
const GREEN: [number, number, number] = [22, 163, 74];
const GREEN_LIGHT: [number, number, number] = [236, 253, 243];
const INK: [number, number, number] = [31, 41, 55];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [209, 213, 219];
const M = 14; // page margin, mm
const FOOTER_SPACE = 22; // kept clear at the bottom of every page for the footer

const TITLES: Record<string, string> = {
  purchase: "PURCHASE INVOICE",
  sale: "SALES INVOICE",
  transfer: "TRANSFER NOTE",
  adjustment: "STOCK ADJUSTMENT",
};
const PARTY_LABEL: Record<string, string> = { purchase: "Supplier", sale: "Customer", transfer: "Client / Customer", adjustment: "Party" };

const money = (n: number) => (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number) => (n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 });
const day = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

// Marks a reference that was inferred rather than named in the transaction
export const ESTIMATED = "~";

// The purchase each line draws on. Newer lines record it; for older transfers and sales it is
// found among the purchases of that line's item, as the one whose number appears in the
// transaction's reference (e.g. "CRV-31/BBF,LC-4-015411/Jv-264/18,..."). Purchase numbers can
// themselves contain "/" and ",", so this matches whole numbers rather than splitting the text,
// and ignores slashes and spaces so typed slips like "FS-00001548Jv-099/18" still match.
// When the reference names none of the item's purchases, the line is put down to the only
// purchase made by that date, or (marked ESTIMATED) to the oldest one, as stock goes out first in first out.
// Purchases and adjustments are their own reference.
async function lineReferences(tx: any): Promise<string[]> {
  const lines = tx.items || [];
  const ownRef = String(tx.reference_number || "");
  if (tx.transaction_type !== "transfer" && tx.transaction_type !== "sale") return lines.map(() => ownRef || "-");
  const squash = (s: string) => s.replace(/[\s/]/g, "").toLowerCase();
  const ownSquashed = squash(ownRef);
  const txDay = tx.transaction_date ? new Date(tx.transaction_date).getTime() : Infinity;

  const itemIdOf = (li: any) => String(li.item_id || li.items?.id || li.item?._id || "");
  const lookup = [...new Set(lines.filter((li: any) => !li.purchaseRef).map(itemIdOf).filter(Boolean))] as string[];
  const purchasesOf: Record<string, any[]> = {};
  await Promise.all(lookup.map(async (id) => {
    const res = await txApi.list({ type: "purchase", itemId: id, limit: "1000" });
    purchasesOf[id] = (res.transactions || []).map(normalizeTransaction);
  }));

  return lines.map((li: any) => {
    if (li.purchaseRef) return li.purchaseRef;
    const purchases = purchasesOf[itemIdOf(li)] || [];
    // Longest match wins, so "FS-1" never claims a reference that really lists "FS-10"
    const named = purchases
      .map((p) => String(p.reference_number || ""))
      .filter((ref) => ref && ownSquashed.includes(squash(ref)))
      .sort((a, b) => b.length - a.length);
    if (named[0]) return named[0];

    const earlier = purchases
      .filter((p) => p.reference_number && new Date(p.transaction_date).getTime() <= txDay)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    if (earlier.length === 1) return earlier[0].reference_number;
    if (earlier.length > 1) return `${ESTIMATED}${earlier[0].reference_number}`;
    return "-";
  });
}

// Shortens text with an ellipsis until it fits maxW at the current font size
function fitText(doc: jsPDF, text: string, maxW: number) {
  if (doc.getTextWidth(text) <= maxW) return text;
  let cut = text;
  while (cut.length > 1 && doc.getTextWidth(`${cut}…`) > maxW) cut = cut.slice(0, -1);
  return `${cut}…`;
}

const lineRow = (li: any, ref: string, i: number) => [
  i + 1,
  li.items?.name || li.item?.name || "Unknown",
  li.items?.sku || li.item?.sku || "-",
  ref,
  qty(li.quantity),
  li.item?.uom || "-",
  money(li.unit_price),
  money(li.total_price),
];

function letterhead(doc: jsPDF, title: string, number: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(18).text("AGRISUN ETHIOPIA", M, 14);
  doc.setFont("helvetica", "normal").setFontSize(9).text("Solar Equipment · Inventory Management", M, 20);
  doc.setFont("helvetica", "bold").setFontSize(15).text(title, pageW - M, 14, { align: "right" });
  // Long transfer numbers list many purchases; show what fits (the Details box has it in full)
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(fitText(doc, `No. ${number || "-"}`, pageW / 2 - M), pageW - M, 20, { align: "right" });
}

// Two side-by-side boxes (e.g. party and details) starting at y; returns their height
function infoBoxes(doc: jsPDF, y: number, boxes: { heading: string; rows: [string, string][] }[]) {
  const pageW = doc.internal.pageSize.getWidth();
  const boxW = (pageW - M * 2 - 6) / 2;
  // Long values (e.g. a transfer number listing many purchases) wrap onto up to 6 lines,
  // ending in "…" if there is more
  doc.setFont("helvetica", "normal").setFontSize(9);
  const wrap = (value: string, width: number) => {
    const all = doc.splitTextToSize(value || "-", width) as string[];
    return all.length <= 6 ? all : [...all.slice(0, 5), fitText(doc, `${all[5]}…`, width)];
  };
  const laid = boxes.map(({ heading, rows }) => ({
    heading,
    rows: rows.map(([label, value]) => ({ label, lines: wrap(value, boxW - (label ? 30 : 8)) })),
  }));
  const heightOf = (rows: { lines: string[] }[]) => 10 + rows.reduce((sum, r) => sum + 6 + (r.lines.length - 1) * 4.2, 0);
  const h = Math.max(...laid.map((b) => heightOf(b.rows)));
  laid.forEach(({ heading, rows }, b) => {
    const x = M + b * (boxW + 6);
    doc.setDrawColor(...LINE).setFillColor(249, 250, 251).roundedRect(x, y, boxW, h, 2, 2, "FD");
    doc.setTextColor(...GREEN).setFont("helvetica", "bold").setFontSize(8).text(heading.toUpperCase(), x + 4, y + 6);
    let ry = y + 12;
    rows.forEach(({ label, lines }) => {
      doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(9).text(label, x + 4, ry);
      doc.setTextColor(...INK).setFont("helvetica", label ? "normal" : "bold");
      doc.text(lines, x + (label ? 26 : 4), ry, { lineHeightFactor: 1.3 });
      ry += 6 + (lines.length - 1) * 4.2;
    });
  });
  return h;
}

// Line-item table that runs onto as many pages as it needs: the header row repeats on every page
// and the totals row only closes the last one. Returns the y just below the table.
function itemTable(doc: jsPDF, startY: number, body: any[][], foot: any[]) {
  autoTable(doc, {
    startY,
    margin: { top: 20, left: M, right: M, bottom: FOOTER_SPACE },
    head: [["No.", "Item", "SKU", "Reference", "Qty", "UOM", "Unit Price", "Total"]],
    body,
    foot: [foot],
    showHead: "everyPage",
    showFoot: "lastPage",
    rowPageBreak: "avoid",
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.2, cellPadding: 2.2, valign: "middle" },
    headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: GREEN_LIGHT, textColor: INK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { cellWidth: 20 },
      3: { cellWidth: 38, fontSize: 8 },
      4: { halign: "right", cellWidth: 12 },
      5: { cellWidth: 12 },
      6: { halign: "right", cellWidth: 23 },
      7: { halign: "right", cellWidth: 25 },
    },
    didParseCell: (d) => {
      // Right-align the quantity and money headers and totals with their columns
      if ((d.section === "head" || d.section === "foot") && [4, 6, 7].includes(d.column.index)) d.cell.styles.halign = "right";
    },
  });
  return (doc as any).lastAutoTable.finalY as number;
}

// A small note under the table when any reference had to be estimated; returns the new y
function estimateNote(doc: jsPDF, y: number, refs: string[]) {
  if (!refs.some((r) => r.startsWith(ESTIMATED))) return y;
  doc.setTextColor(...MUTED).setFont("helvetica", "italic").setFontSize(8);
  const note = doc.splitTextToSize(`${ESTIMATED} The reference number does not name this line's purchase; shown is the item's oldest purchase by that date (first in, first out).`, doc.internal.pageSize.getWidth() - M * 2);
  y = room(doc, y + 5, note.length * 3.5);
  doc.text(note, M, y);
  return y + (note.length - 1) * 3.5;
}

// Moves to a new page when the next block of height h would run into the footer
function room(doc: jsPDF, y: number, h: number) {
  if (y + h <= doc.internal.pageSize.getHeight() - FOOTER_SPACE) return y;
  doc.addPage();
  return 20;
}

function totalBadge(doc: jsPDF, y: number, label: string, amount: number, x?: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const w = 70;
  const left = x ?? pageW - M - w;
  doc.setFillColor(...GREEN).roundedRect(left, y, w, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(9).text(label, left + 4, y + 7.8);
  doc.setFontSize(11).text(money(amount), left + w - 4, y + 7.8, { align: "right" });
}

function signatures(doc: jsPDF, y: number, labels: string[]) {
  const pageW = doc.internal.pageSize.getWidth();
  y = room(doc, y, 14);
  const w = (pageW - M * 2 - 20) / 3;
  labels.forEach((label, i) => {
    const x = M + i * (w + 10);
    doc.setDrawColor(...MUTED).setLineWidth(0.3).line(x, y, x + w, y);
    doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(8).text(label, x, y + 4.5);
  });
}

// "Page X of Y" and the document name at the foot of every page
function pageFooters(doc: jsPDF, label: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE).setLineWidth(0.2).line(M, pageH - 14, pageW - M, pageH - 14);
    doc.setTextColor(...MUTED).setFont("helvetica", "normal").setFontSize(8);
    // Keep the label to the left half so a long reference never runs into the page number
    doc.text(fitText(doc, `Agrisun Ethiopia · ${label}`, pageW / 2 - M - 4), M, pageH - 9);
    doc.text(`Printed ${new Date().toLocaleString("en-GB")} · Page ${p} of ${pages}`, pageW - M, pageH - 9, { align: "right" });
  }
}

function finish(doc: jsPDF, fileName: string, mode: "download" | "print") {
  if (mode === "print") {
    // Open in a new tab with the print dialog; a blocked pop-up returns null, so fall back to
    // saving the file (which then opens straight into printing)
    doc.autoPrint();
    if (window.open(doc.output("bloburl"), "_blank")) return;
  }
  doc.save(`${fileName.replace(/[^\w.-]+/g, "_")}.pdf`);
}

// Invoice for one normalized transaction; "download" saves it, "print" opens it with the print dialog
export async function invoicePdf(tx: any, mode: "download" | "print" = "download") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const type = tx.transaction_type || "transaction";
  const title = TITLES[type] || "INVOICE";

  letterhead(doc, title, tx.reference_number);
  const partyRows: [string, string][] = [["", tx.customer_supplier_name || "-"]];
  if (tx.tin_no) partyRows.push(["TIN", tx.tin_no]);
  if (tx.customer_supplier_contact) partyRows.push(["Contact", tx.customer_supplier_contact]);
  const detailRows: [string, string][] = [["Reference", tx.reference_number || "-"], ["Date", day(tx.transaction_date)], ["Type", capitalize(type)]];
  if (tx.createdBy?.fullName) detailRows.push(["Prepared by", tx.createdBy.fullName]);
  const boxH = infoBoxes(doc, 38, [{ heading: PARTY_LABEL[type] || "Party", rows: partyRows }, { heading: "Details", rows: detailRows }]);

  const lines = tx.items || [];
  const refs = await lineReferences(tx);
  let y = itemTable(doc, 38 + boxH + 8, lines.map((li: any, i: number) => lineRow(li, refs[i], i)),
    ["", "Total", "", "", qty(lines.reduce((s: number, li: any) => s + (li.quantity || 0), 0)), "", "", money(tx.total_amount)]);

  // Notes beside the grand total, both kept together on one page
  const noteLines = tx.notes ? doc.setFont("helvetica", "normal").setFontSize(9).splitTextToSize(tx.notes, pageW - M * 2 - 84) : [];
  y = estimateNote(doc, y, refs);
  y = room(doc, y + 8, Math.max(12, 9 + noteLines.length * 4));
  totalBadge(doc, y, "TOTAL AMOUNT", tx.total_amount);
  if (noteLines.length) {
    doc.setTextColor(...GREEN).setFont("helvetica", "bold").setFontSize(8).text("NOTES", M, y + 4);
    doc.setTextColor(...INK).setFont("helvetica", "normal").setFontSize(9).text(noteLines, M, y + 9);
  }
  signatures(doc, y + Math.max(12, 9 + noteLines.length * 4) + 22, ["Prepared by", "Checked by", "Received by"]);

  pageFooters(doc, `${title} ${tx.reference_number || ""}`);
  finish(doc, `${title.toLowerCase().replace(/ /g, "-")}-${tx.reference_number || ""}`, mode);
}

// Cost sheet for a group of transactions sharing a base reference (see the Cost Sheet page)
export async function costSheetPdf(group: any, mode: "download" | "print" = "download") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  letterhead(doc, "COST SHEET", group.ref);
  const boxH = infoBoxes(doc, 38, [
    { heading: "Client / Supplier", rows: [["", group.client || "-"]] },
    { heading: "Details", rows: [["Reference", group.ref], ["Date", day(group.date)], ["Type", capitalize(group.type)], ["Transactions", String(group.txs?.length || 0)]] },
  ]);

  // Lines from every transaction in the group, each with the reference it draws on
  const rows: any[][] = [];
  let totalQty = 0;
  const refsByTx = await Promise.all((group.txs || []).map(lineReferences));
  for (const [t, tx] of (group.txs || []).entries()) {
    const refs = refsByTx[t];
    (tx.items || []).forEach((li: any, i: number) => {
      rows.push(lineRow(li, refs[i], rows.length));
      totalQty += li.quantity || 0;
    });
  }
  let y = itemTable(doc, 38 + boxH + 8, rows, ["", "Total", "", "", qty(totalQty), "", "", money(group.totalCost)]);

  y = estimateNote(doc, y, refsByTx.flat());
  y = room(doc, y + 8, 12);
  totalBadge(doc, y, "TOTAL COST", group.totalCost, M);
  totalBadge(doc, y, "TOTAL REVENUE", group.totalRevenue, pageW - M - 70);
  signatures(doc, y + 34, ["Prepared by", "Checked by", "Approved by"]);

  pageFooters(doc, `Cost Sheet ${group.ref}`);
  finish(doc, `cost-sheet-${group.ref}`, mode);
}
