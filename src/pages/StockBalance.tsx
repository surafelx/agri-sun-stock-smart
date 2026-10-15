import { useEffect, useState } from "react";
import { stockBalance as sbApi } from "@/lib/api";
import Layout from "@/components/Layout";
import { PrintHeader, PrintButton } from "@/components/PrintHeader";
import ExportDialog from "@/components/ExportDialog";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import RowActions from "@/components/app/RowActions";
import { usePaged, Pager } from "@/components/app/Pager";
import { StockStatusBadge } from "@/components/app/Badges";
import { formatMoney, formatQty, orDash } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, Wallet, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, ArrowRightLeft } from "lucide-react";

const StockBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: "500" };
    if (debouncedSearch) params.search = debouncedSearch;
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    sbApi.list(params)
      .then((res) => setBalances(res.balances || []))
      .catch((err) => toast({ variant: "destructive", title: "Error", description: err.message }))
      .finally(() => setLoading(false));
  }, [debouncedSearch, categoryFilter, statusFilter]);

  const totalItems = balances.length;
  const totalValue = balances.reduce((s, b) => s + (b.inventoryValue || 0), 0);
  const lowStockItems = balances.filter((b) => b.isLowStock && b.quantity > 0).length;
  const outOfStockItems = balances.filter((b) => b.quantity === 0).length;
  const retailValue = balances.reduce((s, b) => s + (b.retailValue || 0), 0);

  const categories = [...new Set(balances.map((b) => b.category?.name).filter(Boolean))];

  const sortedBalances = [...balances].sort((a: any, b: any) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aVal = a[key];
    let bVal = b[key];

    if (key === 'category') {
      aVal = a.category?.name || '';
      bVal = b.category?.name || '';
    }

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const shownValue = sortedBalances.reduce((s, b) => s + (b.inventoryValue || 0), 0);

  // Paging is screen-only: rows off the current page stay in the DOM so printing lists them all
  const paged = usePaged(sortedBalances, 25);
  const onPage = (idx: number) => idx >= paged.page * paged.pageSize && idx < (paged.page + 1) * paged.pageSize;

  const sortHead = (k: string, label: string, right = false) => (
    <TableHead className={`cursor-pointer select-none hover:text-foreground${right ? " text-right" : ""}`} onClick={() => handleSort(k)}>
      <div className={`flex items-center${right ? " justify-end" : ""}`}>{label}{getSortIndicator(k)}</div>
    </TableHead>
  );

  const filtersOn = !!(searchTerm || categoryFilter !== "all" || statusFilter !== "all");
  const alerts = lowStockItems + outOfStockItems;

  return (
    <Layout>
      <div className="space-y-5">
        <PrintHeader title="Stock Balance Sheet" subtitle={`${sortedBalances.length} items • Total value (cost): ${formatMoney(totalValue)}`} />
        <PageHeader
          title="Stock balance"
          description="Quantities and value at cost"
          actions={
            <>
              <ExportDialog itemIds={sortedBalances.map((b: any) => String(b.id))} />
              <PrintButton />
            </>
          }
        />

        <div className={`grid grid-cols-2 gap-3 print:gap-2 ${retailValue > 0 ? "lg:grid-cols-4 print:grid-cols-4" : "lg:grid-cols-3 print:grid-cols-3"}`}>
          <StatCard label="Items" value={formatQty(totalItems)} icon={Package} />
          <StatCard label="Value at cost" value={formatMoney(totalValue)} icon={Wallet} />
          {retailValue > 0 && <StatCard label="Retail value" value={formatMoney(retailValue)} hint="At unit price" icon={TrendingUp} />}
          <StatCard
            label="Stock alerts"
            value={alerts}
            hint={`${lowStockItems} low · ${outOfStockItems} out`}
            icon={AlertTriangle}
            tone={alerts > 0 ? "warning" : "default"}
          />
        </div>

        <Card className="overflow-hidden print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 print:hidden">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search SKU, name, category" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            {(filtersOn || sortConfig) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all"); setSortConfig(null); }}>Clear</Button>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : sortedBalances.length === 0 ? (
            <div className="py-12 text-center">
              {filtersOn ? (
                <>
                  <Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">No results. Try other filters.</p>
                </>
              ) : (
                <>
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="mb-3 text-sm text-muted-foreground">No items in inventory</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/items")}>Go to stock items</Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="print-sheet">
                  <TableHeader>
                    <TableRow>
                      {sortHead("sku", "SKU")}
                      {sortHead("name", "Name")}
                      {sortHead("category", "Category")}
                      {sortHead("uom", "UOM")}
                      {sortHead("quantity", "Quantity", true)}
                      {sortHead("costPrice", "Cost price", true)}
                      {sortHead("inventoryValue", "Value", true)}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10 print:hidden"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBalances.map((b: any, idx: number) => (
                      <TableRow key={b.id} className={onPage(idx) ? undefined : "hidden print:table-row"}>
                        <TableCell className="font-mono text-xs">{b.sku}</TableCell>
                        <TableCell className="font-medium">
                          <button onClick={() => navigate(`/stock-card/${b.id}`)} className="text-left hover:text-primary hover:underline">{b.name}</button>
                        </TableCell>
                        <TableCell>{orDash(b.category?.name)}</TableCell>
                        <TableCell>{orDash(b.uom)}</TableCell>
                        <TableCell className="text-right">{formatQty(b.quantity)}</TableCell>
                        <TableCell className="text-right">{formatMoney(b.costPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(b.inventoryValue)}</TableCell>
                        <TableCell><StockStatusBadge quantity={b.quantity ?? 0} isLowStock={b.isLowStock} /></TableCell>
                        <TableCell className="text-right print:hidden">
                          <RowActions
                            actions={[
                              { label: "Stock card", icon: FileText, onSelect: () => navigate(`/stock-card/${b.id}`) },
                              { label: "Transfer card", icon: ArrowRightLeft, onSelect: () => navigate(`/transfer-card/${b.id}`) },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot className="hidden print:table-footer-group">
                    <TableRow>
                      <TableCell colSpan={6} className="py-2 text-right font-bold text-sm">Total</TableCell>
                      <TableCell className="py-2 text-right font-bold text-sm">{formatMoney(shownValue)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
              <Pager {...paged} />
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default StockBalance;
