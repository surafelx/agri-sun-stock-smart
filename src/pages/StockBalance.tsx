import { useEffect, useState } from "react";
import { stockBalance as sbApi } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, DollarSign, AlertTriangle, Plus, Minus } from "lucide-react";

const StockBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sbApi.list({ limit: "500" })
      .then((res) => setBalances(res.balances || []))
      .catch((err) => toast({ variant: "destructive", title: "Error", description: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const totalItems = balances.length;
  const totalValue = balances.reduce((s, b) => s + (b.inventoryValue || 0), 0);
  const totalCost = balances.reduce((s, b) => s + (b.inventoryValue || 0), 0);
  const lowStockItems = balances.filter((b) => b.isLowStock && b.quantity > 0).length;
  const outOfStockItems = balances.filter((b) => b.quantity === 0).length;

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
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-xs">SKU</TableHead>
                      <TableHead className="h-9 text-xs">Name</TableHead>
                      <TableHead className="h-9 text-xs">Category</TableHead>
                      <TableHead className="h-9 text-xs">UOM</TableHead>
                      <TableHead className="h-9 text-xs text-right">Quantity</TableHead>
                      <TableHead className="h-9 text-xs text-right">Cost Price</TableHead>
                      <TableHead className="h-9 text-xs text-right">Inventory Value</TableHead>
                      <TableHead className="h-9 text-xs">Status</TableHead>
                      <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balances.map((b: any) => {
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
