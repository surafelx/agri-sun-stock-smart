import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { items as itemsApi, transactions as txApi, normalizeItem, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { PrintHeader, PrintButton } from "@/components/PrintHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { StockStatusBadge, TxTypeBadge } from "@/components/app/Badges";
import { formatDate, formatMoney, formatQty, orDash } from "@/lib/format";
import { ArrowLeft, ArrowRightLeft, AlertCircle, FileText, Package, Search, Wallet } from "lucide-react";
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

  // One row per line: a transfer can take this item from several purchases
  const lineRows = (tx: any) => (tx.items || []).filter((li: any) => li.item_id === itemId);

  const filteredTransfers = transfers.filter((tx) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return tx.reference_number?.toLowerCase().includes(t)
      || tx.customer_supplier_name?.toLowerCase().includes(t)
      || tx.notes?.toLowerCase().includes(t);
  });

  const totalQtyOut = transfers.reduce((s, tx) => {
    return s + lineRows(tx).reduce((ss: number, li: any) => ss + (li.quantity || 0), 0);
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
            <Button variant="outline" onClick={() => navigate('/items')}>Back to stock items</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const balance = item.quantity ?? 0;
  const isLow = balance <= (item.low_stock_threshold ?? 10);
  const dash = <span className="text-muted-foreground">—</span>;

  return (
    <Layout>
      <div className="space-y-5">
        <PrintHeader
          title="Transfer Card Cost Sheet"
          subtitle={`${item.name} • SKU ${item.sku}${searchTerm ? ` • Filtered by "${searchTerm}"` : ""}`}
        />
        <PageHeader
          title={item.name}
          description={`${item.sku} · ${item.categories?.name || "Uncategorized"}`}
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/stock-card/${item.id}`}><FileText className="mr-1.5 h-4 w-4" />Stock card</Link>
              </Button>
              <PrintButton />
            </>
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <StatCard label="Current balance" value={formatQty(balance)} hint={item.uom || undefined} icon={Package} />
          <StatCard label="Cost price" value={formatMoney(item.cost_price)} icon={Wallet} />
          <StatCard label="Transfers" value={formatQty(transfers.length)} hint={`${formatQty(totalQtyOut)} transferred out`} icon={ArrowRightLeft} />
          <StatCard label="Status" value={<StockStatusBadge quantity={balance} isLowStock={isLow} />} />
        </div>

        <Card className="overflow-hidden print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 print:hidden">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search reference, party, notes" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" />
            </div>
            {searchTerm && <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>Clear</Button>}
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowRightLeft className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">{transfers.length === 0 ? "No transfers recorded for this item yet" : "No transfers match your search"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>From purchase</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.flatMap((tx) => lineRows(tx).map((lineItem: any, idx: number) => (
                    <TableRow key={`${tx.id}-${idx}`}>
                      <TableCell className="whitespace-nowrap">{formatDate(tx.transaction_date)}</TableCell>
                      <TableCell><TxTypeBadge type={tx.transaction_type || "transfer"} /></TableCell>
                      <TableCell className="max-w-[160px] truncate font-mono text-xs print:max-w-none print:whitespace-normal" title={tx.reference_number || undefined}>{orDash(tx.reference_number)}</TableCell>
                      <TableCell className="font-mono text-xs">{lineItem.purchaseRef || dash}</TableCell>
                      <TableCell className="max-w-[180px] truncate print:max-w-none print:whitespace-normal" title={tx.customer_supplier_name || undefined}>{orDash(tx.customer_supplier_name)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground print:max-w-none print:whitespace-normal" title={tx.notes || undefined}>{orDash(tx.notes)}</TableCell>
                      <TableCell className="text-right">{formatQty(lineItem.quantity)}</TableCell>
                      <TableCell className="text-right">{formatMoney(lineItem.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(lineItem.total_price)}</TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default TransferStockCard;
