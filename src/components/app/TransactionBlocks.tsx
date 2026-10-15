import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatQty, orDash } from "@/lib/format";
import { cn } from "@/lib/utils";

// What the other side of a transaction is called, by type
export const partyLabel = (type: string) => type === 'purchase' ? 'Supplier' : type === 'transfer' ? 'Client' : 'Customer';

// Date, party, TIN, contact, who prepared it and notes, as a compact two-column block
export const TxDetailsBlock = ({ tx }: { tx: any }) => {
  const rows: [string, ReactNode][] = [
    ["Date", formatDate(tx.transaction_date)],
    [partyLabel(tx.transaction_type), orDash(tx.customer_supplier_name)],
    ["TIN", <span className="font-mono">{orDash(tx.tin_no || tx.tinNo)}</span>],
    ["Contact", orDash(tx.customer_supplier_contact)],
  ];
  if (tx.createdBy?.fullName) rows.push(["Prepared by", tx.createdBy.fullName]);
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-w-0 gap-3">
          <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
      {tx.notes && (
        <div className="flex min-w-0 gap-3 sm:col-span-2">
          <dt className="w-24 shrink-0 text-muted-foreground">Notes</dt>
          <dd className="min-w-0 whitespace-pre-line break-words">{tx.notes}</dd>
        </div>
      )}
    </dl>
  );
};

// The lines of a transaction with a total row; sales also show profit
export const TxLinesTable = ({ tx }: { tx: any }) => {
  const isSale = tx.transaction_type === 'sale';
  const lines = tx.items || [];
  const totalProfit = lines.reduce((s: number, li: any) => s + (li.profit || 0), 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Unit price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          {isSale && <TableHead className="text-right">Profit</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((li: any, idx: number) => (
          <TableRow key={li.id || idx}>
            <TableCell className="font-medium">{li.items?.name || 'Unknown'}</TableCell>
            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{orDash(li.items?.sku)}</TableCell>
            <TableCell className="max-w-[180px]"><span className="block truncate font-mono text-xs" title={li.purchaseRef || undefined}>{orDash(li.purchaseRef)}</span></TableCell>
            <TableCell className="text-right">{formatQty(li.quantity)}</TableCell>
            <TableCell className="text-right">{formatMoney(li.unit_price)}</TableCell>
            <TableCell className="text-right">{formatMoney(li.total_price)}</TableCell>
            {isSale && <TableCell className={cn("text-right", (li.profit || 0) >= 0 ? "text-emerald-700" : "text-red-600")}>{formatMoney(li.profit)}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="font-medium">Total</TableCell>
          <TableCell className="text-right font-semibold">{formatMoney(tx.total_amount)}</TableCell>
          {isSale && <TableCell className={cn("text-right font-semibold", totalProfit >= 0 ? "text-emerald-700" : "text-red-600")}>{formatMoney(totalProfit)}</TableCell>}
        </TableRow>
      </TableFooter>
    </Table>
  );
};
