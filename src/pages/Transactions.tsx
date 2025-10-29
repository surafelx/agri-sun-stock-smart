import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShoppingCart, TrendingUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment';
  transaction_date: string;
  reference_number: string;
  customer_supplier_name: string;
  total_amount: number;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    type: 'purchase' | 'sale' | 'adjustment';
    reference: string;
    customerSupplier: string;
    contact: string;
    notes: string;
    items: Array<{ itemId: string; quantity: string; unitPrice: string }>;
  }>({
    type: "purchase",
    reference: "",
    customerSupplier: "",
    contact: "",
    notes: "",
    items: [{ itemId: "", quantity: "", unitPrice: "" }],
  });

  useEffect(() => {
    fetchTransactions();
    fetchItems();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching transactions",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, unit_price');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching items:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalAmount = formData.items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + (qty * price);
      }, 0);

      // Insert transaction
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert([{
          transaction_type: formData.type,
          reference_number: formData.reference,
          customer_supplier_name: formData.customerSupplier,
          customer_supplier_contact: formData.contact,
          notes: formData.notes,
          total_amount: totalAmount,
          created_by: user.id,
        }])
        .select()
        .single();

      if (transError) throw transError;

      // Insert transaction items
      const transactionItems = formData.items
        .filter(item => item.itemId && item.quantity && item.unitPrice)
        .map(item => ({
          transaction_id: transaction.id,
          item_id: item.itemId,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unitPrice),
          total_price: parseFloat(item.quantity) * parseFloat(item.unitPrice),
        }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Transaction created successfully",
      });

      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating transaction",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: "purchase" as const,
      reference: "",
      customerSupplier: "",
      contact: "",
      notes: "",
      items: [{ itemId: "", quantity: "", unitPrice: "" }],
    });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemId: "", quantity: "", unitPrice: "" }],
    });
  };

  const removeItemRow = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill unit price when item is selected
    if (field === 'itemId') {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        newItems[index].unitPrice = selectedItem.unit_price.toString();
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4" />;
      case 'sale':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
            <p className="text-muted-foreground">Record purchases and sales</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Transaction</DialogTitle>
                <DialogDescription>
                  Record a new purchase or sale transaction
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'purchase' | 'sale' | 'adjustment') => 
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="sale">Sale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Number *</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="e.g., INV-2024-001"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerSupplier">
                      {formData.type === 'purchase' ? 'Supplier' : 'Customer'} Name *
                    </Label>
                    <Input
                      id="customerSupplier"
                      value={formData.customerSupplier}
                      onChange={(e) => setFormData({ ...formData, customerSupplier: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="Phone or email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Line Items</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Item</Label>
                          <Select
                            value={item.itemId}
                            onValueChange={(value) => updateItem(index, 'itemId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((invItem) => (
                                <SelectItem key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemRow(index)}
                          disabled={formData.items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Transaction</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All purchases and sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first transaction to track inventory movement</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Customer/Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge
                            variant={transaction.transaction_type === 'purchase' ? 'secondary' : 'default'}
                            className="gap-1"
                          >
                            {getTransactionIcon(transaction.transaction_type)}
                            {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{transaction.reference_number}</TableCell>
                        <TableCell>{transaction.customer_supplier_name}</TableCell>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ETB {transaction.total_amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Transactions;
