import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { items as itemsApi, transactions as txApi, normalizeItem, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRightLeft, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TransferStockCard = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<any>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (itemId) fetchData();
  }, [itemId]);

  const fetchData = async () => {
    try {
      const [itemRes, txRes] = await Promise.all([
        itemsApi.get(itemId!),
        txApi.list({ limit: "500", type: "transfer", itemId: itemId! }),
      ]);
      setItem(normalizeItem(itemRes.item));
      setTransfers((txRes.transactions || []).map(normalizeTransaction));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error loading transfer card", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter((tx) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return tx.reference_number?.toLowerCase().includes(t)
      || tx.customer_supplier_name?.toLowerCase().includes(t)
      || tx.notes?.toLowerCase().includes(t);
  });

  const totalQtyOut = transfers.reduce((s, tx) => {
    return s + (tx.items || []).reduce((ss: number, li: any) => ss + (li.quantity || 0), 0);
  }, 0);

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
              <h2 className="text-2xl font-bold">Transfer Card Cost Sheet</h2>
              <p className="text-sm text-muted-foreground">Transfer history and cost tracking for this item</p>
            </div>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  {item.name} — Cost Sheet
                </CardTitle>
                <CardDescription className="text-sm">
                  SKU: {item.sku} • Category: {item.categories?.name || "Uncategorized"}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{transfers.length}</div>
                <p className="text-xs text-muted-foreground">Total Transfers</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Cost Price</p><p className="font-semibold">{item.cost_price}</p></div>
              <div><p className="text-muted-foreground text-xs">Total Qty Transferred Out</p><p className="font-semibold">{totalQtyOut}</p></div>
              <div>
                <p className="text-muted-foreground text-xs">Current Balance</p>
                <Badge variant={item.quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                  {item.quantity} units
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-base">Transfer Logs</CardTitle><CardDescription className="text-sm">All transfer transactions involving this item</CardDescription></div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input placeholder="Search reference, supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredTransfers.length === 0 ? (
              <div className="text-center py-8">
                <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{transfers.length === 0 ? "No transfers recorded for this item yet" : "No transfers match your search"}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-xs">Date</TableHead>
                      <TableHead className="h-9 text-xs">Reference</TableHead>
                      <TableHead className="h-9 text-xs">From / Supplier</TableHead>
                      <TableHead className="h-9 text-xs">Notes</TableHead>
                      <TableHead className="h-9 text-xs text-right">Qty</TableHead>
                      <TableHead className="h-9 text-xs text-right">Unit Price</TableHead>
                      <TableHead className="h-9 text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransfers.map((tx) => {
                      const lineItem = (tx.items || []).find((li: any) => li.item_id === itemId);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="py-2 text-xs">
                            {new Date(tx.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-xs">{tx.reference_number}</TableCell>
                          <TableCell className="py-2 text-xs">{tx.customer_supplier_name || '-'}</TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">{tx.notes || '-'}</TableCell>
                          <TableCell className="py-2 text-right text-xs font-medium">{lineItem?.quantity || 0}</TableCell>
                          <TableCell className="py-2 text-right text-xs">{lineItem?.unit_price?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell className="py-2 text-right text-xs font-semibold">{lineItem?.total_price?.toFixed(2) || '0.00'}</TableCell>
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

export default TransferStockCard;
