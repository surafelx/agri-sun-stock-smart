import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { items as itemsApi, normalizeItem } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const StockCard = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemId) fetchStockCard();
  }, [itemId]);

  const fetchStockCard = async () => {
    try {
      const res = await itemsApi.stockCard(itemId!);
      setItem(normalizeItem(res.item));
      setMovements(res.movements || []);
      setCurrentBalance(res.currentBalance ?? 0);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error loading stock card", description: err.message });
    } finally {
      setLoading(false);
    }
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

  if (!item) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Item not found</h3>
            <Button onClick={() => navigate('/items')}>Back to Items</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/items')}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
            <div>
              <h2 className="text-2xl font-bold">Stock Card - Balance Sheet</h2>
              <p className="text-sm text-muted-foreground">Inventory ledger and balance tracking</p>
            </div>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription className="text-sm">
                  SKU: {item.sku} • Category: {item.categories?.name || "Uncategorized"}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{currentBalance}</div>
                <p className="text-xs text-muted-foreground">Current Balance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Cost Price</p><p className="font-semibold">{item.cost_price}</p></div>
              <div><p className="text-muted-foreground text-xs">Total Movements</p><p className="font-semibold">{movements.length}</p></div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={currentBalance > 0 ? "secondary" : "destructive"} className="text-xs">
                  {currentBalance > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock Ledger</CardTitle>
            <CardDescription className="text-sm">Detailed inventory movements and balance tracking</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {movements.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No transactions recorded for this item yet</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-xs">Date</TableHead>
                      <TableHead className="h-9 text-xs">Description</TableHead>
                      <TableHead className="h-9 text-xs">Reference</TableHead>
                      <TableHead className="h-9 text-xs text-right">Debit (In)</TableHead>
                      <TableHead className="h-9 text-xs text-right">Credit (Out)</TableHead>
                      <TableHead className="h-9 text-xs text-right">Balance</TableHead>
                      <TableHead className="h-9 text-xs text-right">Remaining</TableHead>
                      <TableHead className="h-9 text-xs text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mv, idx) => (
                      <TableRow key={mv.id || idx}>
                        <TableCell className="py-2 text-xs">
                          {new Date(mv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="py-2 text-xs">
                          {mv.type?.charAt(0).toUpperCase() + mv.type?.slice(1)}
                          {mv.customerSupplier ? ` — ${mv.customerSupplier}` : ''}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs">{mv.reference}</TableCell>
                        <TableCell className="py-2 text-right text-xs">
                          {mv.quantityIn > 0 ? `${mv.quantityIn} @ ${mv.unitPrice}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs">
                          {mv.quantityOut > 0 ? `${mv.quantityOut} @ ${mv.unitPrice}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-sm">{mv.balance}</TableCell>
                        <TableCell className="py-2 text-right text-xs">
                          {mv.remaining != null ? mv.remaining : mv.quantityIn > 0 ? mv.quantityIn : '-'}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs">
                          {(mv.valueIn - mv.valueOut).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
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

export default StockCard;
