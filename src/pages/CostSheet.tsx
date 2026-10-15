import { Fragment, useEffect, useState } from "react";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { TxTypeBadge } from "@/components/app/Badges";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Hash, Users, Wallet, TrendingUp, FileText, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { costSheetPdf } from "@/lib/invoicePdf";
import { formatDate, formatMoney, formatQty, orDash } from "@/lib/format";

interface CostGroup {
  ref: string;
  fullRefs: Set<string>;
  txs: any[];
  client: string;
  date: string;
  type: string;
  totalCost: number;
  totalRevenue: number;
  items: any[];
}

// Cost and amount are the same figure for most transfers; only show both when they differ
const differs = (a: number, b: number) => Math.abs(a - b) >= 0.005;

// What a line cost us: its value less the profit recorded on it. A sale's unit price is the
// selling price, so value alone would make cost equal revenue; transfers carry no profit.
const lineCost = (li: any) => (li.unit_price || 0) * (li.quantity || 0) - (li.profit || 0);

const CostSheet = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchTransactions();
  }, [debouncedSearch, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "1000" };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "all") params.type = typeFilter;
      else params.type = "transfer,sale";
      const res = await txApi.list(params);
      setTransactions((res.transactions || []).map(normalizeTransaction));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const grouped = transactions.reduce<Record<string, CostGroup>>((acc, tx) => {
    const fullRef = tx.reference_number || "No Reference";
    const ref = fullRef.split('/')[0];
    if (!acc[ref]) acc[ref] = { ref, fullRefs: new Set<string>(), txs: [], client: tx.customer_supplier_name, date: tx.transaction_date, type: tx.transaction_type, totalCost: 0, totalRevenue: 0, items: [] };
    acc[ref].fullRefs.add(fullRef);
    acc[ref].txs.push(tx);
    for (const li of tx.items || []) {
      acc[ref].items.push(li);
      acc[ref].totalCost += lineCost(li);
    }
    acc[ref].totalRevenue += tx.total_amount || 0;
    return acc;
  }, {});

  const groups: CostGroup[] = Object.values(grouped);

  const totalCost = transactions.reduce((sum, tx) =>
    sum + (tx.items || []).reduce((s: number, li: any) => s + lineCost(li), 0), 0
  );
  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
  const totalClients = new Set(transactions.map((tx) => tx.customer_supplier_name).filter(Boolean)).size;
  const transfersOnly = typeFilter === "transfer";
  const allExpanded = groups.length > 0 && groups.every((g) => expandedRefs.has(g.ref));

  const toggleRef = (ref: string) => {
    const next = new Set(expandedRefs);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    setExpandedRefs(next);
  };

  const generateGroupPDF = (group: CostGroup) =>
    costSheetPdf(group).catch((err: any) => toast({ variant: "destructive", title: "Error generating PDF", description: err.message }));

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Cost sheet" description="Transfers and sales grouped by reference" />

        <div className={`grid grid-cols-2 gap-3 ${transfersOnly ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          <StatCard label="References" value={formatQty(groups.length)} icon={Hash} />
          <StatCard label="Clients" value={formatQty(totalClients)} icon={Users} />
          {transfersOnly ? (
            <StatCard label="Transfer value" value={formatMoney(totalRevenue)} icon={Wallet} />
          ) : (
            <>
              <StatCard label="Total cost" value={formatMoney(totalCost)} hint="Stock cost of the lines" icon={Wallet} />
              <StatCard label="Revenue" value={formatMoney(totalRevenue)} hint="Transaction totals" icon={TrendingUp} />
            </>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search client or reference" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Transfers and sales" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Transfers and sales</SelectItem>
                <SelectItem value="transfer">Transfers only</SelectItem>
                <SelectItem value="sale">Sales only</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || typeFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}>Clear</Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-muted-foreground"
              disabled={groups.length === 0}
              onClick={() => setExpandedRefs(allExpanded ? new Set() : new Set(groups.map((g) => g.ref)))}
            >
              {allExpanded ? <ChevronsDownUp className="h-4 w-4" /> : <ChevronsUpDown className="h-4 w-4" />}
              {allExpanded ? "Collapse all" : "Expand all"}
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No transfers or sales match these filters</p>
            </div>
          ) : (
            <div className="divide-y">
              {groups.map((group) => {
                const isExpanded = expandedRefs.has(group.ref);
                const showCost = differs(group.totalCost, group.totalRevenue);
                const totalQty = group.items.reduce((s: number, li: any) => s + (li.quantity || 0), 0);
                return (
                  <Fragment key={group.ref}>
                    <div className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.035]" onClick={() => toggleRef(group.ref)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-sm font-medium">{group.ref}</div>
                        {group.fullRefs.size > 1 && (
                          <div className="truncate font-mono text-[11px] text-muted-foreground">{Array.from(group.fullRefs).join(" · ")}</div>
                        )}
                        <div className="truncate text-xs text-muted-foreground">{group.client || "No client"} · {formatDate(group.date)}</div>
                      </div>
                      <TxTypeBadge type={group.type} />
                      <div className="w-[120px] shrink-0 text-right sm:w-[150px]">
                        <div className="font-mono text-sm font-medium tabular-nums">{formatMoney(group.totalRevenue)}</div>
                        {showCost && <div className="font-mono text-[11px] text-muted-foreground tabular-nums">Cost {formatMoney(group.totalCost)}</div>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0 text-muted-foreground" title="Download PDF" aria-label="Download PDF" onClick={(e) => { e.stopPropagation(); generateGroupPDF(group); }}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="bg-muted/40 px-4 py-3">
                        <div className="overflow-hidden rounded-md border bg-card">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-8">Item</TableHead>
                                <TableHead className="h-8">SKU</TableHead>
                                <TableHead className="h-8 text-right">Qty</TableHead>
                                <TableHead className="h-8 text-right">Unit price</TableHead>
                                <TableHead className="h-8 text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.items.map((li: any, idx: number) => (
                                <TableRow key={li.id || idx}>
                                  <TableCell className="py-1.5">{li.items?.name || "Unknown"}</TableCell>
                                  <TableCell className="py-1.5 font-mono text-xs">{orDash(li.items?.sku)}</TableCell>
                                  <TableCell className="py-1.5 text-right">{formatQty(li.quantity)}</TableCell>
                                  <TableCell className="py-1.5 text-right">{formatMoney(li.unit_price)}</TableCell>
                                  <TableCell className="py-1.5 text-right font-medium">{formatMoney(li.total_price)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableCell colSpan={2} className="py-1.5 text-xs font-medium">Total · {group.items.length} {group.items.length === 1 ? "line" : "lines"}</TableCell>
                                <TableCell className="py-1.5 text-right font-medium">{formatQty(totalQty)}</TableCell>
                                <TableCell className="py-1.5"></TableCell>
                                <TableCell className="py-1.5 text-right font-semibold">{formatMoney(group.totalRevenue)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                        {showCost && (
                          <div className="mt-2 flex justify-end gap-4 text-xs text-muted-foreground">
                            <span>Revenue <span className="font-mono font-medium text-foreground">{formatMoney(group.totalRevenue)}</span></span>
                            <span>Profit <span className={`font-mono font-medium ${group.totalRevenue - group.totalCost >= 0 ? "text-emerald-700" : "text-red-600"}`}>{formatMoney(group.totalRevenue - group.totalCost)}</span></span>
                          </div>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default CostSheet;
