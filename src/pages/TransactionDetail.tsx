import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

const TransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (transactionId) {
      txApi.get(transactionId)
        .then((res) => setTransaction(normalizeTransaction(res.transaction)))
        .catch((err) => toast({ variant: "destructive", title: "Error fetching transaction", description: err.message }))
        .finally(() => setLoading(false));
    }
  }, [transactionId]);

  const generatePDF = () => {
    if (!transaction) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Type: ${transaction.transaction_type?.toUpperCase()}`, 20, 40);
    doc.text(`Reference: ${transaction.reference_number}`, 20, 50);
    doc.text(`Date: ${new Date(transaction.transaction_date).toLocaleDateString()}`, 20, 60);
    doc.text(`${transaction.transaction_type === 'purchase' ? 'Supplier' : 'Customer'}: ${transaction.customer_supplier_name}`, 20, 70);
    if (transaction.customer_supplier_contact) doc.text(`Contact: ${transaction.customer_supplier_contact}`, 20, 80);
    let y = 100;
    doc.setFontSize(10);
    doc.text('Item', 20, y); doc.text('Qty', 120, y); doc.text('Unit Price', 140, y); doc.text('Total', 170, y);
    y += 10; doc.line(20, y, 190, y); y += 5;
    (transaction.items || []).forEach((li: any) => {
      doc.text(li.items?.name || 'Unknown', 20, y);
      doc.text(String(li.quantity), 120, y);
      doc.text(`ETB ${li.unit_price?.toFixed(2)}`, 140, y);
      doc.text(`ETB ${li.total_price?.toFixed(2)}`, 170, y);
      y += 10;
    });
    y += 10; doc.line(20, y, 190, y); y += 10;
    doc.setFontSize(12);
    doc.text(`Total: ETB ${transaction.total_amount?.toFixed(2)}`, 140, y);
    doc.save(`invoice-${transaction.reference_number}.pdf`);
  };

  const totalProfit = (transaction?.items || []).reduce((s: number, li: any) => s + (li.profit || 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Transaction not found</h2>
          <Button onClick={() => navigate('/transactions')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Transactions</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/transactions')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          <div>
            <h2 className="text-2xl font-bold">Transaction Details</h2>
            <p className="text-sm text-muted-foreground">Reference: {transaction.reference_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {transaction.transaction_type === 'purchase' ? <ShoppingCart className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                {transaction.transaction_type?.charAt(0).toUpperCase() + transaction.transaction_type?.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div><span className="font-medium">Reference:</span> {transaction.reference_number}</div>
              <div><span className="font-medium">Date:</span> {new Date(transaction.transaction_date).toLocaleDateString()}</div>
              <div><span className="font-medium">{transaction.transaction_type === 'purchase' ? 'Supplier' : 'Customer'}:</span> {transaction.customer_supplier_name}</div>
              {transaction.customer_supplier_contact && <div><span className="font-medium">Contact:</span> {transaction.customer_supplier_contact}</div>}
              {transaction.notes && <div><span className="font-medium">Notes:</span> {transaction.notes}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold">ETB {transaction.total_amount?.toLocaleString()}</span>
              </div>
              {transaction.transaction_type === 'sale' && (
                <div className="flex justify-between">
                  <span className="font-medium">Total Profit:</span>
                  <span className="text-lg font-bold text-green-600">ETB {totalProfit.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-4">
                <Button onClick={generatePDF} className="w-full"><FileText className="mr-2 h-4 w-4" />Generate PDF Invoice</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Line Items</CardTitle><CardDescription>Items included in this transaction</CardDescription></CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9">Item</TableHead>
                    <TableHead className="h-9">SKU</TableHead>
                    <TableHead className="h-9 text-right">Quantity</TableHead>
                    <TableHead className="h-9 text-right">Unit Price</TableHead>
                    <TableHead className="h-9 text-right">Total</TableHead>
                    {transaction.transaction_type === 'sale' && <TableHead className="h-9 text-right">Profit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(transaction.items || []).map((li: any) => (
                    <TableRow key={li.id}>
                      <TableCell className="font-medium">{li.items?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-sm">{li.items?.sku || 'N/A'}</TableCell>
                      <TableCell className="text-right">{li.quantity}</TableCell>
                      <TableCell className="text-right">ETB {li.unit_price?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">ETB {li.total_price?.toFixed(2)}</TableCell>
                      {transaction.transaction_type === 'sale' && (
                        <TableCell className="text-right">
                          <Badge variant={(li.profit || 0) >= 0 ? "default" : "destructive"}>ETB {(li.profit || 0).toFixed(2)}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TransactionDetail;
