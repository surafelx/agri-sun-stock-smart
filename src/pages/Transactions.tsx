import { useEffect, useState } from "react";
import { transactions as txApi, items as itemsApi, categories as categoriesApi, suppliers as suppliersApi, normalizeTransaction, normalizeItem, normalizeCategory, normalizeSubcategory } from "@/lib/api";
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
import { Plus, ShoppingCart, TrendingUp, Trash2, FileText, Download, Edit, ArrowRightLeft, Search, ArrowLeft, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";

type TxType = 'purchase' | 'sale' | 'adjustment' | 'transfer';

const emptyItem = () => ({ categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "", purchaseRef: "" });

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [txList, setTxList] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewTx, setViewTx] = useState<any | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemPickerIndex, setItemPickerIndex] = useState(0);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [itemPickerForm, setItemPickerForm] = useState<any>(null);
  const [txPickerOpen, setTxPickerOpen] = useState(false);
  const [txPickerSearch, setTxPickerSearch] = useState("");
  const [txPickerTarget, setTxPickerTarget] = useState<"create" | "edit">("create");
  const [itemPickerSelected, setItemPickerSelected] = useState<any | null>(null);
  const [itemPickerStockCard, setItemPickerStockCard] = useState<any[]>([]);
  const [itemPickerStockLoading, setItemPickerStockLoading] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierTin, setNewSupplierTin] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editSupplierTin, setEditSupplierTin] = useState("");
  const [editSupplierContact, setEditSupplierContact] = useState("");

  const defaultForm = { type: "purchase" as TxType, reference: "", customerSupplier: "", contact: "", notes: "", date: new Date().toISOString().split('T')[0], tinNo: "", items: [emptyItem()] };
  const [formData, setFormData] = useState(defaultForm);
  const [editFormData, setEditFormData] = useState(defaultForm);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchAll();
  }, [debouncedSearch, typeFilter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const txParams: Record<string, string> = { limit: "500" };
      if (debouncedSearch) txParams.search = debouncedSearch;
      if (typeFilter !== "all") txParams.type = typeFilter;
      const [txRes, itemRes] = await Promise.all([txApi.list(txParams), itemsApi.list({ limit: "500" })]);
      setTxList((txRes.transactions || []).map(normalizeTransaction));
      setItemsList((itemRes.items || []).map(normalizeItem));
      const supRes = await suppliersApi.list({ limit: "500" });
      setSuppliersList((supRes.suppliers || []).map((s: any) => ({ id: s._id || s.id, name: s.name, contact: s.contact || "", tinNo: s.tin_no || s.tinNo || "" })));
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
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleCreateAndSelectSupplier = async () => {
    if (!newSupplierName.trim()) { toast({ variant: "destructive", title: "Error", description: "Supplier name is required" }); return; }
    try {
      const res = await suppliersApi.create({ name: newSupplierName.trim(), tin_no: newSupplierTin.trim(), contact: newSupplierContact.trim() });
      const created = res.supplier;
      setFormData({ ...formData, customerSupplier: created.name, tinNo: created.tinNo || created.tin_no || "", contact: created.contact || "" });
      setNewSupplierName(""); setNewSupplierTin(""); setNewSupplierContact("");
      setSupplierModalOpen(false);
      fetchAll();
      toast({ title: "Success", description: "Supplier created and selected" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    try {
      await suppliersApi.update(editingSupplier.id || editingSupplier._id, {
        name: editSupplierName.trim(),
        tin_no: editSupplierTin.trim(),
        contact: editSupplierContact.trim(),
      });
      setFormData({ ...formData, customerSupplier: editSupplierName.trim(), tinNo: editSupplierTin.trim(), contact: editSupplierContact.trim() });
      setEditingSupplier(null);
      fetchAll();
      toast({ title: "Success", description: "Supplier updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const lineItems = formData.items.filter((i) => i.itemId && i.quantity).map((i) => ({
        item: i.itemId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) || 0,
      }));
      if (lineItems.length === 0) { toast({ variant: "destructive", title: "Error", description: "Add at least one item" }); return; }

      const ref = formData.reference || `TRF-${Date.now()}`;
      const finalRef = formData.type === 'transfer' && formData.items.some(i => i.purchaseRef) 
        ? `${ref}/${formData.items.find(i => i.purchaseRef)?.purchaseRef || ''}`
        : ref;
      await txApi.create({
        transactionType: formData.type,
        transactionDate: formData.date,
        referenceNumber: finalRef,
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
      doc.text(`${tx.transaction_type === 'purchase' ? 'Supplier' : tx.transaction_type === 'transfer' ? 'From' : 'Customer'}: ${tx.customer_supplier_name}`, 20, 70);
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

  const filteredTxList = txList;

  const isItemSpec = (n: string) => /\d+[x.\/]\d|\d+mm|\d+w\b|\d+kw|\d+ah|\d+v\b|dsc|dcp|dcm|spw|inverter|solar panel|battery|cable|pipe|hose|sheet|clamp|gasket|flange|fuse|reducer|connecter|control box|gutter|ridge|silicon|cutter|wire|peg|nut|bolt|screw|valve|pump|meter|steel|aluminum|hdpe|pvc|rolled metal|flash|ega|korkor|soldering|water filter|well casing|shs |rhs |gi /i.test(n);

  const uniqueSuppliers = Array.from(new Map([
    ...txList.filter((tx) => tx.customer_supplier_name && !isItemSpec(tx.customer_supplier_name)).map((tx) => [tx.customer_supplier_name, {
      name: tx.customer_supplier_name,
      contact: tx.customer_supplier_contact || "",
      tinNo: tx.tin_no || tx.tinNo || "",
    }]),
    ...suppliersList.map((s) => [s.name, s]),
  ].map(([name, data]: [string, any]) => [name, { name, contact: data.contact || "", tinNo: data.tinNo || "" }])).values());

  const renderItemRows = (formState: typeof formData, setFormState: (f: any) => void) => {
    return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground">
        <div>Category</div>
        <div>Subcategory</div>
        <div>Item</div>
        <div>Qty</div>
        <div>Unit Price</div>
        <div></div>
      </div>
      {formState.items.map((item, index) => (
        <div key={index} className="grid grid-cols-6 gap-2 items-end">
          <div>
            <Select value={item.categoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'categoryId', v) })}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Select value={item.subcategoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'subcategoryId', v) })}>
              <SelectTrigger><SelectValue placeholder="Subcategory" /></SelectTrigger>
              <SelectContent>{subcategoriesList.filter((s) => !item.categoryId || s.category_id === item.categoryId).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            {formState.type === 'purchase' ? (
              <Select value={item.itemId || ""} onValueChange={(v) => {
                const updates = updateFormItem(formState, index, 'itemId', v);
                setFormState({ ...formState, items: updates });
              }}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {filteredItemsForRow(item.categoryId, item.subcategoryId).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Button type="button" variant="outline" className="w-full justify-start text-left h-10 font-normal" onClick={() => { setItemPickerIndex(index); setItemPickerForm(formState); setItemPickerSearch(""); setItemPickerOpen(true); }}>
                {item.itemId ? itemsList.find((i) => i.id === item.itemId)?.name || "Selected" : "Select item"}
              </Button>
            )}
          </div>
          <div>
            <Input type="number" step="0.01" value={item.quantity} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'quantity', e.target.value) })} placeholder="0" />
          </div>
          <div>
            <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'unitPrice', e.target.value) })} placeholder="0.00" />
          </div>
          <div className="flex items-end gap-0.5 pb-0.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormState({ ...formState, items: [...formState.items, emptyItem()] })} className="h-9 w-9 p-0">
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormState({ ...formState, items: formState.items.filter((_, i) => i !== index) })} disabled={formState.items.length === 1} className="h-9 w-9 p-0">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight">Transactions</h2><p className="text-sm text-muted-foreground">Record purchases, sales, and transfers</p></div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData(defaultForm); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" />New Transaction</Button></DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-lg">Create Transaction</DialogTitle><DialogDescription className="text-sm">Record a new purchase, sale, or transfer</DialogDescription></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={(v: TxType) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Reference Number {formData.type !== 'transfer' ? '*' : ''}</Label>
                    <div className="flex gap-2">
                      <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder={formData.type === 'transfer' ? "Auto-generated if empty" : "e.g., INV-2024-001"} required={formData.type !== 'transfer'} className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={() => { setTxPickerTarget("create"); setTxPickerSearch(""); setTxPickerOpen(true); }}>Select</Button>
                    </div>
                  </div>
                  <div className="space-y-1"><Label>Transaction Date *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{formData.type === 'purchase' ? 'Supplier' : formData.type === 'transfer' ? 'From' : 'Customer'} {formData.type !== 'transfer' && '*'}</Label>
                    <Button type="button" variant="outline" className="w-full justify-start text-left h-9 font-normal" onClick={() => setSupplierModalOpen(true)}>
                      {formData.customerSupplier ? (
                        <span>
                          {formData.customerSupplier}
                          {formData.tinNo && <span className="text-muted-foreground ml-2 text-xs">TIN: {formData.tinNo}</span>}
                          {formData.contact && <span className="text-muted-foreground ml-2 text-xs">• {formData.contact}</span>}
                        </span>
                      ) : "Select or create supplier..."}
                    </Button>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="font-semibold">Line Items</h4>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Transaction History</CardTitle><CardDescription className="text-sm">All purchases, sales, and transfers</CardDescription></CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search reference, customer/supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchTerm || typeFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}>Clear</Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportToExcel}><Download className="mr-1.5 h-4 w-4" />Export</Button>
                </div>
              </div>
              {txList.length === 0 ? (
                <div className="text-center py-8"><ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No transactions yet</h3></div>
              ) : filteredTxList.length === 0 ? (
                <div className="text-center py-8"><Search className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No results found</h3><p className="text-sm text-muted-foreground">Try adjusting your search or filters</p></div>
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
                      {filteredTxList.map((tx) => (
                        <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewTx(tx)}>
                          <TableCell className="py-2">
                            <Badge variant={tx.transaction_type === 'purchase' ? 'secondary' : tx.transaction_type === 'transfer' ? 'outline' : 'default'} className="gap-1 text-xs">
                              {tx.transaction_type === 'purchase' ? <ShoppingCart className="h-3 w-3" /> : tx.transaction_type === 'transfer' ? <ArrowRightLeft className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {tx.transaction_type?.charAt(0).toUpperCase() + tx.transaction_type?.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">
                            <span className="hover:text-primary hover:underline">{tx.reference_number}</span>
                          </TableCell>
                          <TableCell className="text-sm py-2">{tx.customer_supplier_name}</TableCell>
                          <TableCell className="text-sm py-2">{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold text-sm py-2">ETB {tx.total_amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); generatePDF(tx.id); }} className="h-7 w-7 p-0" title="PDF"><FileText className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(tx); }} className="h-7 w-7 p-0" title="Edit"><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteId(tx.id); }} className="h-7 w-7 p-0" title="Delete"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
            <div className="space-y-1"><Label>Reference Number *</Label>
              <div className="flex gap-2">
                <Input value={editFormData.reference} onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })} required className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => { setTxPickerTarget("edit"); setTxPickerSearch(""); setTxPickerOpen(true); }}>Select</Button>
              </div>
            </div>
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

      <Dialog open={txPickerOpen} onOpenChange={(open) => { if (!open) setTxPickerOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Select Transaction</DialogTitle>
            <DialogDescription>Search by reference number, customer/supplier, or type</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reference, customer, type..." value={txPickerSearch} onChange={(e) => setTxPickerSearch(e.target.value)} className="pl-9" autoFocus />
          </div>
          <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Type</TableHead>
                  <TableHead className="h-8 text-xs">Reference</TableHead>
                  <TableHead className="h-8 text-xs">Customer/Supplier</TableHead>
                  <TableHead className="h-8 text-xs">Date</TableHead>
                  <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                  <TableHead className="h-8 text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = txList.filter((tx) => {
                    if (!txPickerSearch) return true;
                    const t = txPickerSearch.toLowerCase();
                    return tx.reference_number?.toLowerCase().includes(t)
                      || tx.customer_supplier_name?.toLowerCase().includes(t)
                      || tx.transaction_type?.toLowerCase().includes(t);
                  });
                  if (filtered.length === 0) return <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No transactions found</TableCell></TableRow>;
                  return filtered.map((tx) => (
                    <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                      const txItems = (tx.items || []).map((li: any) => ({
                        categoryId: li.items?.category_id || "",
                        subcategoryId: li.items?.subcategory_id || "",
                        itemId: li.item_id || li.items?.id || "",
                        quantity: String(li.quantity ?? ""),
                        unitPrice: String(li.unit_price ?? ""),
                      }));
                      if (txPickerTarget === "create") {
                        setFormData({
                          ...formData,
                          reference: tx.reference_number,
                          type: tx.transaction_type,
                          customerSupplier: tx.customer_supplier_name || "",
                          contact: tx.customer_supplier_contact || "",
                          tinNo: tx.tin_no || tx.tinNo || "",
                          date: tx.transaction_date ? new Date(tx.transaction_date).toISOString().split('T')[0] : formData.date,
                          items: txItems.length > 0 ? txItems : [emptyItem()],
                        });
                      } else {
                        setEditFormData({
                          ...editFormData,
                          reference: tx.reference_number,
                          customerSupplier: tx.customer_supplier_name || "",
                          contact: tx.customer_supplier_contact || "",
                          tinNo: tx.tin_no || tx.tinNo || "",
                        });
                      }
                      setTxPickerOpen(false);
                    }}>
                      <TableCell className="py-2">
                        <Badge variant={tx.transaction_type === 'purchase' ? 'secondary' : tx.transaction_type === 'transfer' ? 'outline' : 'default'} className="gap-1 text-xs">
                          {tx.transaction_type?.charAt(0).toUpperCase() + tx.transaction_type?.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs py-2">{tx.reference_number}</TableCell>
                      <TableCell className="text-sm py-2">{tx.customer_supplier_name}</TableCell>
                      <TableCell className="text-sm py-2">{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right text-sm py-2 font-medium">ETB {tx.total_amount?.toLocaleString()}</TableCell>
                      <TableCell className="text-right py-2"><Button variant="ghost" size="sm" className="h-7 text-xs">Select</Button></TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={itemPickerOpen} onOpenChange={(open) => { if (!open) { setItemPickerOpen(false); setItemPickerSelected(null); setItemPickerStockCard([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{itemPickerSelected ? `${itemPickerSelected.name} — Purchase History` : "Select Item"}</DialogTitle>
            <DialogDescription>{itemPickerSelected ? "Choose a specific purchase to reference" : "Search and choose an item for this line"}</DialogDescription>
          </DialogHeader>
          {itemPickerSelected ? (
            <>
              <Button variant="ghost" size="sm" className="mb-2 w-fit" onClick={() => { setItemPickerSelected(null); setItemPickerStockCard([]); }}>
                <ArrowLeft className="h-4 w-4 mr-1" />Back to items
              </Button>
              {itemPickerStockLoading ? (
                <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : itemPickerStockCard.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No purchase history found for this item</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    const newItems = [...itemPickerForm.items];
                    newItems[itemPickerIndex] = { ...newItems[itemPickerIndex], itemId: itemPickerSelected.id, quantity: String(itemPickerSelected.quantity ?? ""), unitPrice: String(itemPickerSelected.cost_price || itemPickerSelected.unit_price || ""), purchaseRef: "" };
                    setFormData({ ...itemPickerForm, items: newItems });
                    setItemPickerOpen(false);
                    setItemPickerSelected(null);
                  }}>Select without purchase reference</Button>
                </div>
              ) : (
                <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Date</TableHead>
                        <TableHead className="h-8 text-xs">Reference</TableHead>
                        <TableHead className="h-8 text-xs">Supplier</TableHead>
                        <TableHead className="h-8 text-xs text-right">Purchased Qty</TableHead>
                        <TableHead className="h-8 text-xs text-right">Unit Price</TableHead>
                        <TableHead className="h-8 text-xs text-right">Remaining</TableHead>
                        <TableHead className="h-8 text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemPickerStockCard.filter((mv) => mv.quantityIn > 0 && (mv.remaining ?? mv.quantityIn) > 0).map((mv, idx) => (
                        <TableRow key={mv.id || idx} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                          const newItems = [...itemPickerForm.items];
                          newItems[itemPickerIndex] = { ...newItems[itemPickerIndex], itemId: itemPickerSelected.id, quantity: String(mv.remaining ?? mv.quantity ?? mv.quantityIn), unitPrice: String(mv.unitPrice), purchaseRef: mv.reference || "" };
                          setFormData({ ...itemPickerForm, items: newItems });
                          setItemPickerOpen(false);
                          setItemPickerSelected(null);
                          setItemPickerStockCard([]);
                        }}>
                          <TableCell className="text-xs py-2">{new Date(mv.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono text-xs py-2">{mv.reference || '-'}</TableCell>
                          <TableCell className="text-xs py-2">{mv.customerSupplier || '-'}</TableCell>
                          <TableCell className="text-right text-xs py-2 font-medium">{mv.quantity ?? mv.quantityIn}</TableCell>
                          <TableCell className="text-right text-xs py-2">ETB {mv.unitPrice?.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs py-2">{mv.remaining ?? mv.balance}</TableCell>
                          <TableCell className="text-right py-2"><Button variant="ghost" size="sm" className="h-7 text-xs">Select</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, SKU, category..." value={itemPickerSearch} onChange={(e) => setItemPickerSearch(e.target.value)} className="pl-9" autoFocus />
              </div>
              <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-xs">Name</TableHead>
                      <TableHead className="h-8 text-xs">SKU</TableHead>
                      <TableHead className="h-8 text-xs">Category</TableHead>
                      <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                      <TableHead className="h-8 text-xs text-right">Cost Price</TableHead>
                      <TableHead className="h-8 text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const row = itemPickerForm?.items?.[itemPickerIndex];
                      const filtered = itemsList.filter((inv) => {
                        const matchCat = !row?.categoryId || inv.category_id === row.categoryId;
                        const matchSub = !row?.subcategoryId || inv.subcategory_id === row.subcategoryId;
                        const matchSearch = !itemPickerSearch || (() => {
                          const t = itemPickerSearch.toLowerCase();
                          return inv.name?.toLowerCase().includes(t) || inv.sku?.toLowerCase().includes(t) || inv.categories?.name?.toLowerCase().includes(t);
                        })();
                        return matchCat && matchSub && matchSearch;
                      });
                      if (filtered.length === 0) return <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No items found</TableCell></TableRow>;
                      return filtered.map((inv) => (
                        <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={async () => {
                          setItemPickerSelected(inv);
                          setItemPickerStockLoading(true);
                          try {
                            const res = await itemsApi.stockCard(inv.id);
                            setItemPickerStockCard(Array.isArray(res?.movements) ? res.movements : []);
                          } catch {
                            setItemPickerStockCard([]);
                          } finally {
                            setItemPickerStockLoading(false);
                          }
                        }}>
                          <TableCell className="text-sm py-2 font-medium">{inv.name}</TableCell>
                          <TableCell className="font-mono text-sm py-2">{inv.sku}</TableCell>
                          <TableCell className="text-sm py-2">{inv.categories?.name || '-'}</TableCell>
                          <TableCell className="text-right text-sm py-2">{inv.quantity}</TableCell>
                          <TableCell className="text-right text-sm py-2">ETB {(inv.cost_price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right py-2"><Button variant="ghost" size="sm" className="h-7 text-xs">Select</Button></TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewTx && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  {viewTx.transaction_type === 'purchase' ? <ShoppingCart className="h-5 w-5" /> : viewTx.transaction_type === 'transfer' ? <ArrowRightLeft className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                  {viewTx.transaction_type?.charAt(0).toUpperCase() + viewTx.transaction_type?.slice(1)} Details
                </DialogTitle>
                <DialogDescription>Reference: {viewTx.reference_number}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-medium text-muted-foreground">Reference:</span> <span className="ml-2">{viewTx.reference_number}</span></div>
                  <div><span className="font-medium text-muted-foreground">Date:</span> <span className="ml-2">{new Date(viewTx.transaction_date).toLocaleDateString()}</span></div>
                  <div><span className="font-medium text-muted-foreground">{viewTx.transaction_type === 'purchase' ? 'Supplier' : viewTx.transaction_type === 'transfer' ? 'From' : 'Customer'}:</span> <span className="ml-2">{viewTx.customer_supplier_name}</span></div>
                  {viewTx.customer_supplier_contact && <div><span className="font-medium text-muted-foreground">Contact:</span> <span className="ml-2">{viewTx.customer_supplier_contact}</span></div>}
                  {viewTx.tin_no && <div><span className="font-medium text-muted-foreground">TIN Number:</span> <span className="ml-2 font-mono">{viewTx.tin_no}</span></div>}
                  {viewTx.notes && <div><span className="font-medium text-muted-foreground">Notes:</span> <span className="ml-2">{viewTx.notes}</span></div>}
                  <div><span className="font-medium text-muted-foreground">Created:</span> <span className="ml-2">{viewTx.created_at ? new Date(viewTx.created_at).toLocaleString() : '-'}</span></div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-lg font-bold">ETB {viewTx.total_amount?.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{viewTx.items?.length || 0} item(s)</p>
                  {viewTx.transaction_type === 'sale' && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Profit: </span>
                      <span className={`font-bold ${viewTx.items?.reduce((s: number, li: any) => s + (li.profit || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ETB {viewTx.items?.reduce((s: number, li: any) => s + (li.profit || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {viewTx.items?.length > 0 && (
                <div className="border rounded-lg mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Item</TableHead>
                        <TableHead className="h-8 text-xs">SKU</TableHead>
                        <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                        <TableHead className="h-8 text-xs text-right">Unit Price</TableHead>
                        <TableHead className="h-8 text-xs text-right">Total</TableHead>
                        {viewTx.transaction_type === 'sale' && <TableHead className="h-8 text-xs text-right">Profit</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewTx.items.map((li: any) => (
                        <TableRow key={li.id}>
                          <TableCell className="text-sm py-2 font-medium">{li.items?.name || 'Unknown'}</TableCell>
                          <TableCell className="font-mono text-sm py-2">{li.items?.sku || 'N/A'}</TableCell>
                          <TableCell className="text-right text-sm py-2">{li.quantity}</TableCell>
                          <TableCell className="text-right text-sm py-2">ETB {li.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-semibold">ETB {li.total_price?.toFixed(2)}</TableCell>
                          {viewTx.transaction_type === 'sale' && (
                            <TableCell className="text-right text-sm py-2">
                              <Badge variant={(li.profit || 0) >= 0 ? "default" : "destructive"}>ETB {(li.profit || 0).toFixed(2)}</Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setViewTx(null); generatePDF(viewTx.id); }}><FileText className="mr-1.5 h-4 w-4" />PDF</Button>
                <Button variant="outline" size="sm" onClick={() => { setViewTx(null); openEditDialog(viewTx); }}><Edit className="mr-1.5 h-4 w-4" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setViewTx(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Select Supplier</DialogTitle>
            <DialogDescription>Choose an existing supplier or create a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." id="supplier-modal-search" className="pl-9" onChange={(e) => {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('[data-supplier-row]').forEach((row) => {
                  const name = (row as HTMLElement).dataset.supplierName || "";
                  (row as HTMLElement).style.display = name.toLowerCase().includes(val) ? "" : "none";
                });
              }} />
            </div>
            <div className="border rounded-lg max-h-[30vh] overflow-y-auto">
              {uniqueSuppliers.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No suppliers found. Create one below.</p>
              ) : uniqueSuppliers.map((s) => (
                <div
                  key={s.name}
                  data-supplier-row
                  data-supplier-name={s.name}
                  className="px-3 py-2 border-b last:border-b-0"
                >
                  {editingSupplier?.name === s.name ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
                        <Input value={editSupplierTin} onChange={(e) => setEditSupplierTin(e.target.value)} placeholder="TIN" className="h-8 text-sm" />
                        <Input value={editSupplierContact} onChange={(e) => setEditSupplierContact(e.target.value)} placeholder="Contact" className="h-8 text-sm" />
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingSupplier(null)}>Cancel</Button>
                        <Button type="button" size="sm" className="h-7 text-xs" onClick={handleUpdateSupplier}>Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div
                        className="flex-1 cursor-pointer hover:text-primary"
                        onClick={() => {
                          setFormData({ ...formData, customerSupplier: s.name, tinNo: s.tinNo || "", contact: s.contact || "" });
                          setSupplierModalOpen(false);
                        }}
                      >
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.tinNo ? `TIN: ${s.tinNo}` : ""}{s.tinNo && s.contact ? " • " : ""}{s.contact || ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {formData.customerSupplier === s.name && <Badge variant="default" className="text-xs mr-1">Selected</Badge>}
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => {
                          e.stopPropagation();
                          setEditingSupplier(s);
                          setEditSupplierName(s.name);
                          setEditSupplierTin(s.tinNo || "");
                          setEditSupplierContact(s.contact || "");
                        }}><Pencil className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2">Create New Supplier</h4>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Supplier name *" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                <Input placeholder="TIN No" value={newSupplierTin} onChange={(e) => setNewSupplierTin(e.target.value)} />
                <Input placeholder="Contact" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
              </div>
              <div className="flex justify-end mt-2">
                <Button type="button" size="sm" onClick={handleCreateAndSelectSupplier} disabled={!newSupplierName.trim()}>Create & Select</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Transactions;
