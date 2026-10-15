// One way to show numbers and dates across the app (the PDFs and Excel exports use the same)

const moneyFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** 1,234,567.80 */
export const formatMoney = (n: number | null | undefined) => moneyFmt.format(Number(n) || 0);

/** 1,234 or 12.5 — quantities keep their decimals only when they have some */
export const formatQty = (n: number | null | undefined) => qtyFmt.format(Number(n) || 0);

/** 1.2M, 350K — for chart axes and tight stat tiles */
export const formatCompact = (n: number | null | undefined) => compactFmt.format(Number(n) || 0);

/** 01 Oct 2026 */
export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/** 01 Oct 2026, 14:05 */
export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  return isNaN(date.getTime()) ? "—" : `${formatDate(date)}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Empty values read as a quiet dash rather than "N/A" */
export const orDash = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
