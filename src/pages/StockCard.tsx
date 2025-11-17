import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  quantity: number;
}

interface StockMovement {
  id: string;
  date: string;
  reference: string;
  type: 'purchase' | 'sale' | 'adjustment';
  quantity_in: number;
  quantity_out: number;
  balance: number;
  unit_price: number;
  notes: string;
  customer_supplier: string;
}

const StockCard = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      fetchStockCard();
    }
  }, [itemId]);

  const fetchStockCard = async () => {
    try {
      // Fetch item details
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;
      setItem(itemData);

      // Fetch transaction items for this item
      const { data: transactionItems, error: transError } = await supabase
        .from('transaction_items')
        .select(`
          *,
          transactions!inner(
            transaction_type,
            transaction_date,
            reference_number,
            customer_supplier_name,
            notes
          )
        `)
        .eq('item_id', itemId)
        .order('transactions(transaction_date)', { ascending: true });

      if (transError) throw transError;

      // Calculate running balance
      let runningBalance = 0;
      const movementsData: StockMovement[] = transactionItems.map((ti: any) => {
        const transaction = ti.transactions;
        const quantityIn = transaction.transaction_type === 'purchase' ? ti.quantity : 0;
        const quantityOut = transaction.transaction_type === 'sale' ? ti.quantity : 0;
        
        runningBalance += quantityIn - quantityOut;

        return {
          id: ti.id,
          date: transaction.transaction_date,
          reference: transaction.reference_number,
          type: transaction.transaction_type,
          quantity_in: quantityIn,
          quantity_out: quantityOut,
          balance: runningBalance,
          unit_price: ti.unit_price,
          notes: transaction.notes || '',
          customer_supplier: transaction.customer_supplier_name || 'N/A',
        };
      });

      setMovements(movementsData);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading stock card",
        description: error.message,
      });
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/items')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Stock Card</h2>
              <p className="text-sm text-muted-foreground">Transaction history and balance</p>
            </div>
          </div>
        </div>

        {/* Item Details Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription className="text-sm">SKU: {item.sku} • Category: {item.category}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{item.quantity}</div>
                <p className="text-xs text-muted-foreground">Current Balance</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Unit Price</p>
                <p className="font-semibold">ETB {item.unit_price}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Value</p>
                <p className="font-semibold">ETB {(item.quantity * item.unit_price).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Movements</p>
                <p className="font-semibold">{movements.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={item.quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                  {item.quantity > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Movement History</CardTitle>
            <CardDescription className="text-sm">Complete transaction history with running balance</CardDescription>
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
                      <TableHead className="h-9 text-xs">Type</TableHead>
                      <TableHead className="h-9 text-xs">Reference</TableHead>
                      <TableHead className="h-9 text-xs">Customer/Supplier</TableHead>
                      <TableHead className="h-9 text-xs text-right">Qty In</TableHead>
                      <TableHead className="h-9 text-xs text-right">Qty Out</TableHead>
                      <TableHead className="h-9 text-xs text-right">Balance</TableHead>
                      <TableHead className="h-9 text-xs text-right">Unit Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="py-2 text-xs">
                          {new Date(movement.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge 
                            variant={movement.type === 'purchase' ? 'secondary' : 'default'}
                            className="text-xs gap-1"
                          >
                            {movement.type === 'purchase' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs">{movement.reference}</TableCell>
                        <TableCell className="py-2 text-xs">{movement.customer_supplier}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-success text-xs">
                          {movement.quantity_in > 0 ? `+${movement.quantity_in}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 text-right font-semibold text-destructive text-xs">
                          {movement.quantity_out > 0 ? `-${movement.quantity_out}` : '-'}
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold text-sm">
                          {movement.balance}
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs">
                          ETB {movement.unit_price}
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
