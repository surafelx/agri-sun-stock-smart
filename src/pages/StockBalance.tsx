 import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Package, TrendingUp, DollarSign, AlertTriangle, Eye, Plus, Minus } from "lucide-react";

interface Item {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  low_stock_threshold: number;
  categories?: {
    name: string;
  };
  subcategories?: {
    name: string;
  };
}

interface TransactionItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  transactions: {
    id: string;
    transaction_type: 'purchase' | 'sale' | 'adjustment';
    transaction_date: string;
    reference_number: string;
    customer_supplier_name: string;
  };
}

interface ItemWithTransactions {
  item: Item;
  transactions: TransactionItem[];
  runningBalance: number[];
}

interface BalanceSummary {
  totalItems: number;
  totalValue: number;
  totalCost: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const StockBalance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [itemsWithTransactions, setItemsWithTransactions] = useState<ItemWithTransactions[]>([]);
  const [summary, setSummary] = useState<BalanceSummary>({
    totalItems: 0,
    totalValue: 0,
    totalCost: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockBalance();
  }, []);

  const fetchStockBalance = async () => {
    try {
      // First get all items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*, categories(name), subcategories(name)')
        .order('name');

      if (itemsError) throw itemsError;

      const items = itemsData || [];

      // For each item, get its transaction history
      const itemsWithTransactionsData: ItemWithTransactions[] = [];

      for (const item of items) {
        const { data: transactionsData, error: transError } = await supabase
          .from('transaction_items')
          .select(`
            id,
            quantity,
            unit_price,
            total_price,
            transactions (
              id,
              transaction_type,
              transaction_date,
              reference_number,
              customer_supplier_name
            )
          `)
          .eq('item_id', item.id)
          .order('transactions(transaction_date)', { ascending: true });

        if (transError) throw transError;

        const transactions = transactionsData || [];

        // Calculate running balance starting from current quantity and working backwards
        // This ensures we never show negative balances
        let currentBalance = item.quantity;
        const runningBalances: number[] = [];

        // Work backwards from current balance
        for (let i = transactions.length - 1; i >= 0; i--) {
          runningBalances.unshift(currentBalance);
          if (transactions[i].transactions.transaction_type === 'purchase') {
            currentBalance -= transactions[i].quantity;
          } else if (transactions[i].transactions.transaction_type === 'sale') {
            currentBalance += transactions[i].quantity;
          }
        }

        itemsWithTransactionsData.push({
          item,
          transactions,
          runningBalance: runningBalances,
        });
      }

      setItemsWithTransactions(itemsWithTransactionsData);

      // Calculate summary
      const summaryData: BalanceSummary = {
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0),
        totalCost: items.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0),
        lowStockItems: items.filter(item => item.quantity > 0 && item.quantity <= item.low_stock_threshold).length,
        outOfStockItems: items.filter(item => item.quantity === 0).length,
      };

      setSummary(summaryData);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching stock balance",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const getStockStatus = (item: Item) => {
    if (item.quantity === 0) return { status: "Out of Stock", variant: "destructive" as const };
    if (item.quantity <= item.low_stock_threshold) return { status: "Low Stock", variant: "secondary" as const };
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {summary.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current market value</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {summary.totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total acquisition cost</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.lowStockItems + summary.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">
                {summary.lowStockItems} low + {summary.outOfStockItems} out
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Stock Transaction History</CardTitle>
            <CardDescription>Complete transaction history for all inventory items with running balances</CardDescription>
          </CardHeader>
          <CardContent>
            {itemsWithTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items in inventory</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first inventory item</p>
                <Button onClick={() => navigate('/items')}>
                  Go to Items Management
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {itemsWithTransactions.map((itemWithTrans) => {
                  const { item, transactions, runningBalance } = itemWithTrans;
                  const stockStatus = getStockStatus(item);

                  return (
                    <div key={item.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.categories?.name || "Uncategorized"}
                              {item.subcategories?.name && ` > ${item.subcategories.name}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={stockStatus.variant} className="text-xs mb-1">
                              {stockStatus.status}
                            </Badge>
                            <div className="text-sm">
                              Current Balance: <span className="font-semibold">{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          No transactions yet
                        </div>
                      ) : (
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((transaction, index) => (
                              <TableRow key={transaction.id}>
                                <TableCell className="py-2 text-sm">
                                  {new Date(transaction.transactions.transaction_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge
                                    variant={transaction.transactions.transaction_type === 'purchase' ? 'default' : 'secondary'}
                                    className="gap-1 text-xs"
                                  >
                                    {transaction.transactions.transaction_type === 'purchase' ? (
                                      <Plus className="h-3 w-3" />
                                    ) : (
                                      <Minus className="h-3 w-3" />
                                    )}
                                    {transaction.transactions.transaction_type.charAt(0).toUpperCase() + transaction.transactions.transaction_type.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 font-mono text-xs">
                                  {transaction.transactions.reference_number}
                                </TableCell>
                                <TableCell className="py-2 text-sm">
                                  {transaction.transactions.customer_supplier_name}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {transaction.transactions.transaction_type === 'purchase' ? (
                                    <span className="text-green-600 font-semibold">{transaction.quantity}</span>
                                  ) : (
                                    ''
                                  )}
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  {transaction.transactions.transaction_type === 'sale' ? (
                                    <span className="text-red-600 font-semibold">{transaction.quantity}</span>
                                  ) : (
                                    ''
                                  )}
                                </TableCell>
                                <TableCell className="py-2 text-right font-semibold">
                                  {runningBalance[index] >= 0 ? runningBalance[index] : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockBalance;