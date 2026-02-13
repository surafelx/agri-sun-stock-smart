import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface Transaction {
  id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment';
  transaction_date: string;
  reference_number: string;
  customer_supplier_name: string;
  customer_supplier_contact: string | null;
  notes: string | null;
  total_amount: number;
}

interface TransactionItem {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  profit?: number;
  items?: {
    name: string;
    sku: string;
  };
}

const TransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetail();
    }
  }, [transactionId]);

  const fetchTransactionDetail = async () => {
    try {
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (transError) throw transError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*, items(name, sku)')
        .eq('transaction_id', transactionId);

      if (itemsError) throw itemsError;

      setTransaction(transData);
      setTransactionItems(itemsData || []);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching transaction details",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!transaction) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Transaction Type: ${transaction.transaction_type.toUpperCase()}`, 20, 40);
    doc.text(`Reference: ${transaction.reference_number}`, 20, 50);
    doc.text(`Date: ${new Date(transaction.transaction_date).toLocaleDateString()}`, 20, 60);
    doc.text(`${transaction.transaction_type === 'purchase' ? 'Supplier' : 'Customer'}: ${transaction.customer_supplier_name}`, 20, 70);

    if (transaction.customer_supplier_contact) {
      doc.text(`Contact: ${transaction.customer_supplier_contact}`, 20, 80);
    }

    // Items table
    let y = 100;
    doc.setFontSize(10);
    doc.text('Item', 20, y);
    doc.text('Qty', 120, y);
    doc.text('Unit Price', 140, y);
    doc.text('Total', 170, y);

    y += 10;
    doc.line(20, y, 190, y);
    y += 5;

    transactionItems.forEach((item) => {
      doc.text(item.items?.name || 'Unknown', 20, y);
      doc.text(item.quantity.toString(), 120, y);
      doc.text(`ETB ${item.unit_price.toFixed(2)}`, 140, y);
      doc.text(`ETB ${item.total_price.toFixed(2)}`, 170, y);
      y += 10;
    });

    y += 10;
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ETB ${transaction.total_amount.toFixed(2)}`, 140, y);

    // Save PDF
    doc.save(`invoice-${transaction.reference_number}.pdf`);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-5 w-5" />;
      case 'sale':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return null;
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

  if (!transaction) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Transaction not found</h2>
          <Button onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Transaction Details</h2>
            <p className="text-sm text-muted-foreground">Reference: {transaction.reference_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {getTransactionIcon(transaction.transaction_type)}
                {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Reference:</span> {transaction.reference_number}
              </div>
              <div>
                <span className="font-medium">Date:</span> {new Date(transaction.transaction_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">{transaction.transaction_type === 'purchase' ? 'Supplier' : 'Customer'}:</span> {transaction.customer_supplier_name}
              </div>
              {transaction.customer_supplier_contact && (
                <div>
                  <span className="font-medium">Contact:</span> {transaction.customer_supplier_contact}
                </div>
              )}
              {transaction.notes && (
                <div>
                  <span className="font-medium">Notes:</span> {transaction.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold">ETB {transaction.total_amount.toLocaleString()}</span>
              </div>
              {transaction.transaction_type === 'sale' && (
                <div className="flex justify-between">
                  <span className="font-medium">Total Profit:</span>
                  <span className="text-lg font-bold text-green-600">
                    ETB {transactionItems.reduce((sum, item) => sum + (item.profit || 0), 0).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="pt-4">
                <Button onClick={generatePDF} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate PDF Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Line Items</CardTitle>
            <CardDescription>Items included in this transaction</CardDescription>
          </CardHeader>
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
                    {transaction.transaction_type === 'sale' && (
                      <TableHead className="h-9 text-right">Profit</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.items?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.items?.sku || 'N/A'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">ETB {item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">ETB {item.total_price.toFixed(2)}</TableCell>
                      {transaction.transaction_type === 'sale' && (
                        <TableCell className="text-right">
                          <Badge variant={item.profit >= 0 ? "default" : "destructive"}>
                            ETB {item.profit.toFixed(2)}
                          </Badge>
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