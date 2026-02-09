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
import { Plus, ShoppingCart, TrendingUp, Trash2, FileText, Download, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
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

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Item {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  subcategory_id: string | null;
  categories?: {
    name: string;
  };
  subcategories?: {
    name: string;
  };
}

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    reference: "",
    customerSupplier: "",
    contact: "",
    notes: "",
  });
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    type: 'purchase' | 'sale' | 'adjustment';
    reference: string;
    customerSupplier: string;
    contact: string;
    notes: string;
    items: Array<{ categoryId: string; subcategoryId: string; itemId: string; quantity: string; unitPrice: string }>;
  }>({
    type: "purchase",
    reference: "",
    customerSupplier: "",
    contact: "",
    notes: "",
    items: [{ categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "" }],
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchSubcategories();
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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, sku, category_id, subcategory_id, categories(name), subcategories(name)');

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

      // Validate stock levels for sales
      if (formData.type === 'sale') {
        for (const item of formData.items) {
          if (item.itemId && item.quantity) {
            // Get current stock using the database function
            const { data: currentStock, error: stockError } = await supabase
              .rpc('get_current_stock', { item_id_param: item.itemId });

            if (stockError) throw stockError;

            // Get item name
            const { data: itemData, error: itemError } = await supabase
              .from('items')
              .select('name')
              .eq('id', item.itemId)
              .single();

            if (itemError) throw itemError;

            const requestedQty = parseFloat(item.quantity);
            if (requestedQty > currentStock) {
              throw new Error(`Insufficient stock for ${itemData.name}. Available: ${currentStock}, Requested: ${requestedQty}`);
            }
          }
        }
      }

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
      items: [{ categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "" }],
    });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "" }],
    });
  };

  const removeItemRow = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Reset subcategory and item when category changes
    if (field === 'categoryId') {
      newItems[index].subcategoryId = "";
      newItems[index].itemId = "";
      newItems[index].unitPrice = "";
    }

    // Reset item when subcategory changes
    if (field === 'subcategoryId') {
      newItems[index].itemId = "";
      newItems[index].unitPrice = "";
    }

    // Note: unit_price is no longer stored in items, user must enter manually

    setFormData({ ...formData, items: newItems });
  };

  const handleDelete = async (id: string) => {
    try {
      // Delete transaction items first
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', id);
      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;

      toast({ title: "Success", description: "Transaction deleted successfully" });
      setDeleteId(null);
      fetchTransactions();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error deleting transaction", description: error.message });
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      reference: transaction.reference_number,
      customerSupplier: transaction.customer_supplier_name,
      contact: transaction.customer_supplier_contact || "",
      notes: transaction.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          reference_number: editFormData.reference,
          customer_supplier_name: editFormData.customerSupplier,
          customer_supplier_contact: editFormData.contact || null,
          notes: editFormData.notes || null,
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction updated successfully" });
      setEditDialogOpen(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error updating transaction", description: error.message });
    }
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

  const generatePDF = async (transactionId: string) => {
    try {
      // Fetch transaction with items
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (transError) throw transError;

      const { data: transactionItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*, items(name, sku)')
        .eq('transaction_id', transactionId);

      if (itemsError) throw itemsError;

      // Create PDF
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

      transactionItems?.forEach((item: any) => {
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

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error generating PDF",
        description: error.message,
      });
    }
  };

  const exportToExcel = async () => {
    try {
      // Fetch all transactions with items
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;

      const exportData = [];

      for (const transaction of transactions || []) {
        const { data: transactionItems, error: itemsError } = await supabase
          .from('transaction_items')
          .select('*, items(name, sku)')
          .eq('transaction_id', transaction.id);

        if (itemsError) continue;

        transactionItems?.forEach((item: any) => {
          exportData.push({
            'Transaction Type': transaction.transaction_type,
            'Reference Number': transaction.reference_number,
            'Date': new Date(transaction.transaction_date).toLocaleDateString(),
            'Customer/Supplier': transaction.customer_supplier_name,
            'Contact': transaction.customer_supplier_contact || '',
            'Item Name': item.items?.name || '',
            'SKU': item.items?.sku || '',
            'Quantity': item.quantity,
            'Unit Price': item.unit_price,
            'Total Price': item.total_price,
            'Profit': item.profit || 0,
            'Notes': transaction.notes || '',
          });
        });
      }

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

      // Save file
      XLSX.writeFile(wb, 'transactions-export.xlsx');

      toast({
        title: "Success",
        description: "Excel file exported successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error exporting to Excel",
        description: error.message,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
            <p className="text-sm text-muted-foreground">Record purchases and sales</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Create Transaction</DialogTitle>
                <DialogDescription className="text-sm">
                  Record a new purchase or sale transaction
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="type" className="text-sm">Transaction Type *</Label>
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
                      <div key={index} className="grid grid-cols-5 gap-2 items-end">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={item.categoryId}
                            onValueChange={(value) => updateItem(index, 'categoryId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Subcategory</Label>
                          <Select
                            value={item.subcategoryId}
                            onValueChange={(value) => updateItem(index, 'subcategoryId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Subcategory" />
                            </SelectTrigger>
                            <SelectContent>
                              {subcategories.filter(sub => !item.categoryId || sub.category_id === item.categoryId).map((subcategory) => (
                                <SelectItem key={subcategory.id} value={subcategory.id}>
                                  {subcategory.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Item</Label>
                          <Select
                            value={item.itemId}
                            onValueChange={(value) => updateItem(index, 'itemId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.filter(invItem => {
                                const matchesCategory = !item.categoryId || invItem.category_id === item.categoryId;
                                const matchesSubcategory = !item.subcategoryId || invItem.subcategory_id === item.subcategoryId;
                                return matchesCategory && matchesSubcategory;
                              }).map((invItem) => (
                                <SelectItem key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                            placeholder="0.00"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemRow(index)}
                            disabled={formData.items.length === 1}
                            className="mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Transaction History</CardTitle>
              <CardDescription className="text-sm">All purchases and sales transactions</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No transactions yet</h3>
                  <p className="text-sm text-muted-foreground mb-3">Create your first transaction to track inventory movement</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Type</TableHead>
                        <TableHead className="h-9 text-xs">Reference</TableHead>
                        <TableHead className="h-9 text-xs">Customer/Supplier</TableHead>
                        <TableHead className="h-9 text-xs">Date</TableHead>
                        <TableHead className="h-9 text-xs text-right">Amount</TableHead>
                        <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="py-2">
                            <Badge
                              variant={transaction.transaction_type === 'purchase' ? 'secondary' : 'default'}
                              className="gap-1 text-xs"
                            >
                              {getTransactionIcon(transaction.transaction_type)}
                              {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">
                            <button
                              onClick={() => navigate(`/transactions/${transaction.id}`)}
                              className="hover:text-primary hover:underline"
                            >
                              {transaction.reference_number}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{transaction.customer_supplier_name}</TableCell>
                          <TableCell className="text-sm py-2">{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold text-sm py-2">
                            ETB {transaction.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generatePDF(transaction.id)}
                                className="h-7 w-7 p-0"
                                title="Generate PDF"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(transaction)}
                                className="h-7 w-7 p-0"
                                title="Edit Transaction"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(transaction.id)}
                                className="h-7 w-7 p-0"
                                title="Delete Transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction and all its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Transaction</DialogTitle>
            <DialogDescription className="text-sm">Update the transaction details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-reference">Reference Number *</Label>
              <Input
                id="edit-reference"
                value={editFormData.reference}
                onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer/Supplier Name *</Label>
              <Input
                id="edit-customer"
                value={editFormData.customerSupplier}
                onChange={(e) => setEditFormData({ ...editFormData, customerSupplier: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact</Label>
              <Input
                id="edit-contact"
                value={editFormData.contact}
                onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Update Transaction</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Transactions;
