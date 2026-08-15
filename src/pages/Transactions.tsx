import { useEffect, useState } from "react";
import { transactions as txApi, items as itemsApi, categories as categoriesApi, normalizeTransaction, normalizeItem, normalizeCategory, normalizeSubcategory } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ShoppingCart, TrendingUp, Trash2, FileText, Download, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

type TxType = 'purchase' | 'sale' | 'adjustment';

const emptyItem = () => ({ categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "" });

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [txList, setTxList] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultForm = { type: "purchase" as TxType, reference: "", customerSupplier: "", contact: "", notes: "", date: new Date().toISOString().split('T')[0], tinNo: "", items: [emptyItem()] };
  const [formData, setFormData] = useState(defaultForm);
  const [editFormData, setEditFormData] = useState(defaultForm);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [txRes, itemRes] = await Promise.all([txApi.list({ limit: "200" }), itemsApi.list({ limit: "500" })]);
      setTxList((txRes.transactions || []).map(normalizeTransaction));
      setItemsList((itemRes.items || []).map(normalizeItem));
      await fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching data", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.list();
      const cats = (res.categories || []).map(normalizeCategory);
      setCategoriesList(cats);
      const allSubs: any[] = [];
      for (const cat of cats) {
        const subRes = await categoriesApi.listSubcategories(cat.id);
        (subRes.subcategories || []).forEach((s: any) =>
          allSubs.push(normalizeSubcategory({ ...s, category: { _id: cat.id, name: cat.name } }))
        );
      }
      setSubcategoriesList(allSubs);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const lineItems = formData.items.filter((i) => i.itemId && i.quantity && i.unitPrice).map((i) => ({
        item: i.itemId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice),
      }));
      if (lineItems.length === 0) { toast({ variant: "destructive", title: "Error", description: "Add at least one item" }); return; }

      await txApi.create({
        transactionType: formData.type,
        transactionDate: formData.date,
        referenceNumber: formData.reference,
        customerSupplierName: formData.customerSupplier,
        customerSupplierContact: formData.contact || undefined,
        tinNo: formData.tinNo || undefined,
        notes: formData.notes || undefined,
        items: lineItems,
      });
      toast({ title: "Success", description: "Transaction created" });
      setDialogOpen(false);
      setFormData(defaultForm);
      fetchAll();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error creating transaction", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSubmitting(true);
    try {
      await txApi.update(editingTx.id, {
        transactionDate: editFormData.date,
        referenceNumber: editFormData.reference,
        customerSupplierName: editFormData.customerSupplier,
        customerSupplierContact: editFormData.contact || null,
        tinNo: editFormData.tinNo || null,
        notes: editFormData.notes || null,
      });
      toast({ title: "Success", description: "Transaction updated" });
      setEditDialogOpen(false);
      setEditingTx(null);
      fetchAll();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error updating transaction", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await txApi.delete(id);
      toast({ title: "Success", description: "Transaction deleted and stock reversed" });
      setDeleteId(null);
      fetchAll();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const openEditDialog = (tx: any) => {
    setEditingTx(tx);
    setEditFormData({
      type: tx.transaction_type,
      reference: tx.reference_number,
      customerSupplier: tx.customer_supplier_name || "",
      contact: tx.customer_supplier_contact || "",
      notes: tx.notes || "",
      date: tx.transaction_date ? new Date(tx.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tinNo: tx.tin_no || tx.tinNo || "",
      items: [emptyItem()],
    });
    setEditDialogOpen(true);
  };

  const updateFormItem = (form: typeof formData, index: number, field: string, value: string) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'categoryId') { newItems[index].subcategoryId = ""; newItems[index].itemId = ""; }
    if (field === 'subcategoryId') { newItems[index].itemId = ""; }
    return newItems;
  };

  const generatePDF = async (txId: string) => {
    try {
      const res = await txApi.get(txId);
      const tx = normalizeTransaction(res.transaction);
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('INVOICE', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Type: ${tx.transaction_type?.toUpperCase()}`, 20, 40);
      doc.text(`Reference: ${tx.reference_number}`, 20, 50);
      doc.text(`Date: ${new Date(tx.transaction_date).toLocaleDateString()}`, 20, 60);
      doc.text(`${tx.transaction_type === 'purchase' ? 'Supplier' : 'Customer'}: ${tx.customer_supplier_name}`, 20, 70);
      if (tx.customer_supplier_contact) doc.text(`Contact: ${tx.customer_supplier_contact}`, 20, 80);
      let y = 100;
      doc.setFontSize(10);
      doc.text('Item', 20, y); doc.text('Qty', 120, y); doc.text('Unit Price', 140, y); doc.text('Total', 170, y);
      y += 10; doc.line(20, y, 190, y); y += 5;
      (tx.items || []).forEach((li: any) => {
        doc.text(li.items?.name || 'Unknown', 20, y);
        doc.text(String(li.quantity), 120, y);
        doc.text(`ETB ${li.unit_price.toFixed(2)}`, 140, y);
        doc.text(`ETB ${li.total_price.toFixed(2)}`, 170, y);
        y += 10;
      });
      y += 10; doc.line(20, y, 190, y); y += 10;
      doc.setFontSize(12);
      doc.text(`Total: ETB ${tx.total_amount?.toFixed(2)}`, 140, y);
      doc.save(`invoice-${tx.reference_number}.pdf`);
      toast({ title: "PDF generated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error generating PDF", description: err.message });
    }
  };

  const exportToExcel = () => {
    try {
      const { utils, writeFile } = XLSX;
      const exportData: any[] = [];
      txList.forEach((tx) => {
        (tx.items || []).forEach((li: any) => {
          exportData.push({
            'Type': tx.transaction_type, 'Reference': tx.reference_number,
            'Date': new Date(tx.transaction_date).toLocaleDateString(),
            'Customer/Supplier': tx.customer_supplier_name,
            'Item': li.items?.name || '', 'SKU': li.items?.sku || '',
            'Quantity': li.quantity, 'Unit Price': li.unit_price,
            'Total': li.total_price, 'Profit': li.profit || 0,
          });
        });
      });
      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Transactions');
      writeFile(wb, 'transactions-export.xlsx');
      toast({ title: "Exported successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export failed", description: err.message });
    }
  };

  const filteredItemsForRow = (categoryId: string, subcategoryId: string) =>
    itemsList.filter((inv) => {
      const matchCat = !categoryId || inv.category_id === categoryId;
      const matchSub = !subcategoryId || inv.subcategory_id === subcategoryId;
      return matchCat && matchSub;
    });

  const renderItemRows = (formState: typeof formData, setFormState: (f: any) => void) => (
    <div className="space-y-3">
      {formState.items.map((item, index) => (
        <div key={index} className="grid grid-cols-5 gap-2 items-end">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={item.categoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'categoryId', v) })}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Subcategory</Label>
            <Select value={item.subcategoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'subcategoryId', v) })}>
              <SelectTrigger><SelectValue placeholder="Subcategory" /></SelectTrigger>
              <SelectContent>{subcategoriesList.filter((s) => !item.categoryId || s.category_id === item.categoryId).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Item</Label>
            <Select value={item.itemId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'itemId', v) })}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>{filteredItemsForRow(item.categoryId, item.subcategoryId).map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.sku})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Qty</Label>
            <Input type="number" step="0.01" value={item.quantity} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'quantity', e.target.value) })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'unitPrice', e.target.value) })} placeholder="0.00" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormState({ ...formState, items: formState.items.filter((_, i) => i !== index) })} disabled={formState.items.length === 1} className="mt-1">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight">Transactions</h2><p className="text-sm text-muted-foreground">Record purchases and sales</p></div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData(defaultForm); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" />New Transaction</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-lg">Create Transaction</DialogTitle><DialogDescription className="text-sm">Record a new purchase or sale</DialogDescription></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={(v: TxType) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Reference Number *</Label><Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="e.g., INV-2024-001" required /></div>
                  <div className="space-y-1"><Label>Transaction Date *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{formData.type === 'purchase' ? 'Supplier' : 'Customer'} Name *</Label><Input value={formData.customerSupplier} onChange={(e) => setFormData({ ...formData, customerSupplier: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>TIN No</Label><Input value={formData.tinNo} onChange={(e) => setFormData({ ...formData, tinNo: e.target.value })} placeholder="Tax ID" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Contact</Label><Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Phone or email" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">Line Items</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, items: [...formData.items, emptyItem()] })}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
                  </div>
                  {renderItemRows(formData, setFormData)}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Transaction"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
        ) : (
          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Transaction History</CardTitle><CardDescription className="text-sm">All purchases and sales transactions</CardDescription></CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={exportToExcel}><Download className="mr-1.5 h-4 w-4" />Export to Excel</Button>
              </div>
              {txList.length === 0 ? (
                <div className="text-center py-8"><ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No transactions yet</h3></div>
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
                      {txList.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="py-2">
                            <Badge variant={tx.transaction_type === 'purchase' ? 'secondary' : 'default'} className="gap-1 text-xs">
                              {tx.transaction_type === 'purchase' ? <ShoppingCart className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {tx.transaction_type?.charAt(0).toUpperCase() + tx.transaction_type?.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">
                            <button onClick={() => navigate(`/transactions/${tx.id}`)} className="hover:text-primary hover:underline">{tx.reference_number}</button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{tx.customer_supplier_name}</TableCell>
                          <TableCell className="text-sm py-2">{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold text-sm py-2">ETB {tx.total_amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => generatePDF(tx.id)} className="h-7 w-7 p-0" title="PDF"><FileText className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(tx)} className="h-7 w-7 p-0" title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteId(tx.id)} className="h-7 w-7 p-0" title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the transaction and reverse all stock changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingTx(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="text-lg">Edit Transaction Metadata</DialogTitle><DialogDescription className="text-sm">Update reference, contact, and notes (line items cannot be changed — delete and recreate instead)</DialogDescription></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Reference Number *</Label><Input value={editFormData.reference} onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Transaction Date *</Label><Input type="date" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Contact</Label><Input value={editFormData.contact} onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Customer/Supplier</Label><Input value={editFormData.customerSupplier} onChange={(e) => setEditFormData({ ...editFormData, customerSupplier: e.target.value })} /></div>
            <div className="space-y-1"><Label>TIN No</Label><Input value={editFormData.tinNo} onChange={(e) => setEditFormData({ ...editFormData, tinNo: e.target.value })} placeholder="Tax ID" /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Transactions;
