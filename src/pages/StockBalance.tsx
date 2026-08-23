import { useEffect, useState } from "react";
import { stockBalance as sbApi } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, DollarSign, AlertTriangle, Plus, Minus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const StockBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [colSearch, setColSearch] = useState({ sku: "", name: "", category: "", uom: "", quantity: "", costPrice: "", inventoryValue: "" });
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
  const totalCost = balances.reduce((s, b) => s + (b.inventoryValue || 0), 0);
  const lowStockItems = balances.filter((b) => b.isLowStock && b.quantity > 0).length;
  const outOfStockItems = balances.filter((b) => b.quantity === 0).length;

  const categories = [...new Set(balances.map((b) => b.category?.name).filter(Boolean))];

  const filteredBalances = balances.filter((b: any) => {
    if (colSearch.sku && !b.sku?.toLowerCase().includes(colSearch.sku.toLowerCase())) return false;
    if (colSearch.name && !b.name?.toLowerCase().includes(colSearch.name.toLowerCase())) return false;
    if (colSearch.category && !b.category?.name?.toLowerCase().includes(colSearch.category.toLowerCase())) return false;
    if (colSearch.uom && !b.uom?.toLowerCase().includes(colSearch.uom.toLowerCase())) return false;
    if (colSearch.quantity && !String(b.quantity).includes(colSearch.quantity)) return false;
    if (colSearch.costPrice && !String(b.costPrice).includes(colSearch.costPrice)) return false;
    if (colSearch.inventoryValue && !String(b.inventoryValue).includes(colSearch.inventoryValue)) return false;
    return true;
  });

  const sortedBalances = [...filteredBalances].sort((a: any, b: any) => {
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

  const getStockStatus = (b: any) => {
    if (b.quantity === 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (b.isLowStock) return { status: "Low Stock", variant: "secondary" as const };
    return { status: "In Stock", variant: "default" as const };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Balance Sheet</h2>
          <p className="text-muted-foreground">Complete inventory balance and valuation overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalItems}</div><p className="text-xs text-muted-foreground">Active inventory items</p></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value (Cost)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">ETB {totalValue.toLocaleString()}</div><p className="text-xs text-muted-foreground">At cost price</p></CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retail Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {balances.reduce((s, b) => s + (b.retailValue || 0), 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">At unit price</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockItems + outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">{lowStockItems} low + {outOfStockItems} out</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search SKU, name, category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || categoryFilter !== "all" || statusFilter !== "all" || Object.values(colSearch).some(v => v)) && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all"); setColSearch({ sku: "", name: "", category: "", uom: "", quantity: "", costPrice: "", inventoryValue: "" }); setSortConfig(null); }}>Clear All</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Stock Balance Summary</CardTitle>
            <CardDescription>Current quantity and value for all inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items in inventory</h3>
                <Button onClick={() => navigate('/items')}>Go to Items Management</Button>
              </div>
            ) : sortedBalances.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-1">No results found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-xs cursor-pointer hover:bg-muted" onClick={() => handleSort('sku')}>
                        <div className="flex items-center">SKU {getSortIndicator('sku')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs cursor-pointer hover:bg-muted" onClick={() => handleSort('name')}>
                        <div className="flex items-center">Name {getSortIndicator('name')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs cursor-pointer hover:bg-muted" onClick={() => handleSort('category')}>
                        <div className="flex items-center">Category {getSortIndicator('category')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs cursor-pointer hover:bg-muted" onClick={() => handleSort('uom')}>
                        <div className="flex items-center">UOM {getSortIndicator('uom')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs text-right cursor-pointer hover:bg-muted" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center justify-end">Quantity {getSortIndicator('quantity')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs text-right cursor-pointer hover:bg-muted" onClick={() => handleSort('costPrice')}>
                        <div className="flex items-center justify-end">Cost Price {getSortIndicator('costPrice')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs text-right cursor-pointer hover:bg-muted" onClick={() => handleSort('inventoryValue')}>
                        <div className="flex items-center justify-end">Inventory Value {getSortIndicator('inventoryValue')}</div>
                      </TableHead>
                      <TableHead className="h-9 text-xs">Status</TableHead>
                      <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter SKU"
                          value={colSearch.sku}
                          onChange={(e) => setColSearch({ ...colSearch, sku: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter Name"
                          value={colSearch.name}
                          onChange={(e) => setColSearch({ ...colSearch, name: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter Category"
                          value={colSearch.category}
                          onChange={(e) => setColSearch({ ...colSearch, category: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter UOM"
                          value={colSearch.uom}
                          onChange={(e) => setColSearch({ ...colSearch, uom: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter Qty"
                          value={colSearch.quantity}
                          onChange={(e) => setColSearch({ ...colSearch, quantity: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter Cost"
                          value={colSearch.costPrice}
                          onChange={(e) => setColSearch({ ...colSearch, costPrice: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1">
                        <Input
                          placeholder="Filter Value"
                          value={colSearch.inventoryValue}
                          onChange={(e) => setColSearch({ ...colSearch, inventoryValue: e.target.value })}
                          className="h-7 text-xs"
                        />
                      </TableHead>
                      <TableHead className="h-8 p-1"></TableHead>
                      <TableHead className="h-8 p-1"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBalances.map((b: any) => {
                      const ss = getStockStatus(b);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs py-2">{b.sku}</TableCell>
                          <TableCell className="font-medium text-sm py-2">
                            <button onClick={() => navigate(`/stock-card/${b.id}`)} className="hover:text-primary hover:underline text-left">{b.name}</button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{b.category?.name || '-'}</TableCell>
                          <TableCell className="text-sm py-2">{b.uom || '-'}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">
                            {b.quantity > 0 ? <span className="text-green-600">{b.quantity.toLocaleString()}</span> : <span className="text-red-600">0</span>}
                          </TableCell>
                          <TableCell className="text-right text-sm py-2">ETB {(b.costPrice || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">ETB {(b.inventoryValue || 0).toLocaleString()}</TableCell>
                          <TableCell className="py-2"><Badge variant={ss.variant} className="text-xs">{ss.status}</Badge></TableCell>
                          <TableCell className="text-right py-2">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/stock-card/${b.id}`)} className="h-7 text-xs">View Card</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockBalance;
