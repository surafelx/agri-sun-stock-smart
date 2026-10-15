import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { items as itemsApi, normalizeItem } from "@/lib/api";
import Layout from "@/components/Layout";
import { PrintHeader, PrintButton } from "@/components/PrintHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { StockStatusBadge, TxTypeBadge } from "@/components/app/Badges";
import { formatDate, formatMoney, formatQty, orDash } from "@/lib/format";
import { ArrowLeft, AlertCircle, ArrowRightLeft, ListOrdered, Package, Wallet } from "lucide-react";
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
            <Button variant="outline" onClick={() => navigate('/items')}>Back to stock items</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const isLow = currentBalance <= (item.low_stock_threshold ?? 10);
  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <Layout>
      <div className="space-y-5">
        <PrintHeader title="Stock Card" subtitle={`${item.name} • SKU ${item.sku} • ${item.categories?.name || "Uncategorized"}`} />
        <PageHeader
          title={item.name}
          description={`${item.sku} · ${item.categories?.name || "Uncategorized"}`}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/transfer-card/${item.id}`}><ArrowRightLeft className="mr-1.5 h-4 w-4" />Transfer card</Link>
              </Button>
              <PrintButton />
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <StatCard label="Current balance" value={formatQty(currentBalance)} hint={item.uom || undefined} icon={Package} />
          <StatCard label="Cost price" value={formatMoney(item.cost_price)} icon={Wallet} />
          <StatCard label="Movements" value={formatQty(movements.length)} icon={ListOrdered} />
          <StatCard label="Status" value={<StockStatusBadge quantity={currentBalance} isLowStock={isLow} />} />
        </div>

        <Card className="overflow-hidden print:border-0 print:shadow-none">
          {movements.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No movements recorded for this item yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Unit price</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mv, idx) => (
                    <TableRow key={mv.id || idx}>
                      <TableCell className="whitespace-nowrap">{formatDate(mv.date)}</TableCell>
                      <TableCell><TxTypeBadge type={mv.type} /></TableCell>
                      {/* The reference, and under it the purchase a transfer or sale line drew from */}
                      <TableCell className="max-w-[200px] print:max-w-none">
                        <div className="truncate font-mono text-xs print:whitespace-normal" title={mv.reference || undefined}>{orDash(mv.reference)}</div>
                        {mv.purchaseRef && <div className="truncate text-[11px] text-muted-foreground print:whitespace-normal" title={mv.purchaseRef}>from {mv.purchaseRef}</div>}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate print:max-w-none print:whitespace-normal" title={mv.customerSupplier || undefined}>{orDash(mv.customerSupplier)}</TableCell>
                      <TableCell className="text-right">{mv.quantityIn > 0 ? formatQty(mv.quantityIn) : dash}</TableCell>
                      <TableCell className="text-right">{mv.quantityOut > 0 ? formatQty(mv.quantityOut) : dash}</TableCell>
                      <TableCell className="text-right">{formatMoney(mv.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatQty(mv.balance)}</TableCell>
                      <TableCell className="text-right">{mv.type === "purchase" ? formatQty(mv.remaining ?? mv.quantityIn) : dash}</TableCell>
                      <TableCell className="text-right">{formatMoney((mv.valueIn || 0) - (mv.valueOut || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default StockCard;
