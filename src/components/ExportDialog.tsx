import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { exportStock, ExportLayout, TxType, TX_TYPES } from "@/lib/stockExport";

const LAYOUTS: { value: ExportLayout; label: string; description: string }[] = [
  { value: "summary", label: "Summary only", description: "One sheet: each item's opening, purchased, sold, transferred, adjusted and closing balance, with value." },
  { value: "per-item", label: "Summary + a sheet per item", description: "The summary, then one sheet for every item listing its transactions with a running balance." },
  { value: "single-sheet", label: "Summary + all transactions on one sheet", description: "The summary, then one sheet listing every item's transactions together, with Excel filter buttons." },
];

// Export button + dialog for the stock pages; itemIds are the items currently on screen
const ExportDialog = ({ itemIds }: { itemIds: string[] }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<ExportLayout>("per-item");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [types, setTypes] = useState<TxType[]>(TX_TYPES.map((t) => t.value));
  const [exporting, setExporting] = useState(false);

  const toggleType = (t: TxType, on: boolean) => setTypes((prev) => (on ? [...prev, t] : prev.filter((x) => x !== t)));
  const badRange = !!(from && to && from > to);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { items, sheets } = await exportStock({ layout, from: from || undefined, to: to || undefined, types, itemIds });
      toast({ title: "Export ready", description: `${items} items, ${sheets} sheet${sheets === 1 ? "" : "s"}` });
      setOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export failed", description: err.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={itemIds.length === 0} className="print:hidden"><Download className="mr-1.5 h-4 w-4" />Export</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export to Excel</DialogTitle>
          <DialogDescription>Covers the {itemIds.length} item{itemIds.length === 1 ? "" : "s"} currently shown. Clear the filters to export everything.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="font-semibold">Layout</Label>
            <RadioGroup value={layout} onValueChange={(v) => setLayout(v as ExportLayout)} className="space-y-1">
              {LAYOUTS.map((l) => (
                <label key={l.value} htmlFor={`layout-${l.value}`} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value={l.value} id={`layout-${l.value}`} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{l.label}</div>
                    <div className="text-xs text-muted-foreground">{l.description}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Date range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="export-from" className="text-xs text-muted-foreground">From</Label><Input id="export-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="export-to" className="text-xs text-muted-foreground">To</Label><Input id="export-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
            <p className="text-xs text-muted-foreground">
              {badRange ? <span className="text-destructive">"From" must be on or before "To".</span> : "Leave empty for all dates. With a start date, each item opens with its balance on that day."}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Transaction types</Label>
            <div className="grid grid-cols-2 gap-2">
              {TX_TYPES.map((t) => (
                <label key={t.value} htmlFor={`type-${t.value}`} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id={`type-${t.value}`} checked={types.includes(t.value)} onCheckedChange={(c) => toggleType(t.value, c === true)} />
                  {t.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Picks which transactions are listed. Opening, closing and summary totals always count every type; with some types hidden, the running balance column is left blank.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting || badRange || types.length === 0}>{exporting ? "Exporting..." : "Export"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
