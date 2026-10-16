import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { transactions as txApi, items as itemsApi, categories as categoriesApi, suppliers as suppliersApi, normalizeTransaction, normalizeItem, normalizeCategory, normalizeSubcategory } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileText, Download, Search, ArrowLeft, Pencil, Printer, X } from "lucide-react";
import { invoicePdf } from "@/lib/invoicePdf";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/app/PageHeader";
import RowActions from "@/components/app/RowActions";
import { Pager, usePaged } from "@/components/app/Pager";
import { TxTypeBadge } from "@/components/app/Badges";
import { formatDate, formatMoney, formatQty, orDash } from "@/lib/format";
import { cn } from "@/lib/utils";
import { partyLabel, TxDetailsBlock, TxLinesTable } from "@/components/app/TransactionBlocks";

type TxType = 'purchase' | 'sale' | 'adjustment' | 'transfer';

// Line editor columns: category, subcategory, item, qty, unit price, line total, remove
const LINE_GRID = "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)_88px_112px_112px_32px] items-center gap-2";

const emptyItem = () => ({ categoryId: "", subcategoryId: "", itemId: "", quantity: "", unitPrice: "", purchaseRef: "" });

const toFormItems = (tx: any) => (tx.items || []).map((li: any) => ({
  categoryId: li.items?.category_id || "",
  subcategoryId: li.items?.subcategory_id || "",
  itemId: li.item_id || li.items?.id || "",
  quantity: String(li.quantity ?? ""),
  unitPrice: String(li.unit_price ?? ""),
  purchaseRef: li.purchaseRef || "",
}));

const Transactions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewTx, setViewTx] = useState<any | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemPickerIndex, setItemPickerIndex] = useState(0);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [itemPickerForm, setItemPickerForm] = useState<any>(null);
  const [txPickerOpen, setTxPickerOpen] = useState(false);
  const [txPickerSearch, setTxPickerSearch] = useState("");
  const [txPickerTarget, setTxPickerTarget] = useState<"create" | "edit">("create");
  const [txPickerAll, setTxPickerAll] = useState<any[]>([]);
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
  }, [debouncedSearch, typeFilter, startDate, endDate]);

  // /transactions?edit=<id> opens that transaction's editor (the detail page links here)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const id = searchParams.get('edit');
    if (!id) return;
    setSearchParams({}, { replace: true });
    txApi.get(id)
      .then((res) => openEditDialog(normalizeTransaction(res.transaction)))
      .catch((err) => toast({ variant: "destructive", title: "Couldn't open the transaction", description: err.message }));
  }, [searchParams]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const txParams: Record<string, string> = { limit: "500" };
      if (debouncedSearch) txParams.search = debouncedSearch;
      if (typeFilter !== "all") txParams.type = typeFilter;
      if (startDate) txParams.startDate = startDate;
      if (endDate) txParams.endDate = endDate;
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
    if (!newSupplierName.trim()) { toast({ variant: "destructive", title: "Error", description: formData.type === 'transfer' ? "Client name is required" : "Supplier name is required" }); return; }
    try {
      const res = await suppliersApi.create({ name: newSupplierName.trim(), tin_no: newSupplierTin.trim(), contact: newSupplierContact.trim() });
      const created = res.supplier;
      setFormData({ ...formData, customerSupplier: created.name, tinNo: created.tinNo || created.tin_no || "", contact: created.contact || "" });
      setNewSupplierName(""); setNewSupplierTin(""); setNewSupplierContact("");
      setSupplierModalOpen(false);
      fetchAll();
      toast({ title: "Success", description: formData.type === 'transfer' ? "Client created and selected" : "Supplier created and selected" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    const supplierId = editingSupplier.id || editingSupplier._id;
    if (!supplierId) { toast({ variant: "destructive", title: "Error", description: formData.type === 'transfer' ? "Client ID not found" : "Supplier ID not found" }); return; }
    try {
      await suppliersApi.update(supplierId, {
        name: editSupplierName.trim(),
        tin_no: editSupplierTin.trim(),
        contact: editSupplierContact.trim(),
      } as any);
      setFormData({ ...formData, customerSupplier: editSupplierName.trim(), tinNo: editSupplierTin.trim(), contact: editSupplierContact.trim() });
      setEditingSupplier(null);
      fetchAll();
      toast({ title: "Success", description: formData.type === 'transfer' ? "Client updated" : "Supplier updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const lineItems = formData.items.filter((i) => i.itemId && i.quantity).map((i) => ({
        item: i.itemId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) || 0, purchaseRef: i.purchaseRef || undefined,
      }));
      if (lineItems.length === 0) { toast({ variant: "destructive", title: "Error", description: "Add at least one item" }); return; }

      const ref = formData.reference || `TRF-${Date.now()}`;
      const purchaseRefs = formData.items.filter(i => i.purchaseRef).map(i => i.purchaseRef);
      const finalRef = formData.type === 'transfer' && purchaseRefs.length > 0 
        ? `${ref}/${purchaseRefs.join(',')}`
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
      let lineItems: any[] | undefined;
      let reference = editFormData.reference;
      if (canEditLines) {
        lineItems = editFormData.items.filter((i) => i.itemId && i.quantity).map((i) => ({
          item: i.itemId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) || 0, purchaseRef: i.purchaseRef || undefined,
        }));
        if (lineItems.length === 0) { toast({ variant: "destructive", title: "Error", description: "Add at least one item" }); return; }
        // On a transfer, newly picked purchases replace the purchase refs after the slash, as on create
        const purchaseRefs = editFormData.items.filter((i) => i.purchaseRef).map((i) => i.purchaseRef);
        if (editType === 'transfer' && purchaseRefs.length > 0) reference = `${reference.split('/')[0]}/${purchaseRefs.join(',')}`;
      }
      await txApi.update(editingTx.id, {
        transactionDate: editFormData.date,
        referenceNumber: reference,
        customerSupplierName: editFormData.customerSupplier,
        customerSupplierContact: editFormData.contact || null,
        tinNo: editFormData.tinNo || null,
        notes: editFormData.notes || null,
        ...(lineItems && { items: lineItems }),
      });
      toast({ title: "Saved", description: lineItems ? `${editTypeLabel} updated and stock adjusted` : "Transaction updated" });
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

  // Purchases, sales and transfers can have their lines rewritten; that moves stock (and, for a
  // purchase, the average cost), so the API only lets admins do it. Adjustments stay as they are.
  const LINE_EDITABLE = ['purchase', 'sale', 'transfer'];
  const editType: string = editingTx?.transaction_type || '';
  const canEditLines = LINE_EDITABLE.includes(editType) && user?.role === 'admin';
  const editTypeLabel = editType ? editType.charAt(0).toUpperCase() + editType.slice(1) : 'Transaction';
  const editLinesHint: Record<string, string> = {
    purchase: "The old quantities come out of stock and the new ones go in. The items' average cost is recalculated.",
    sale: "The old quantities go back into stock and the new ones are taken out. Profit is recalculated at today's cost price.",
    transfer: "The old quantities go back into stock and the new ones are taken out.",
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
      items: tx.items?.length ? toFormItems(tx) : [emptyItem()],
    });
    setEditDialogOpen(true);
  };

  // The item picker serves both the create and the edit dialog
  const applyPickedItems = (newItems: any[]) => {
    if (editDialogOpen) setEditFormData({ ...itemPickerForm, items: newItems });
    else setFormData({ ...itemPickerForm, items: newItems });
  };

  const updateFormItem = (form: typeof formData, index: number, field: string, value: string) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'categoryId') { newItems[index].subcategoryId = ""; newItems[index].itemId = ""; }
    if (field === 'subcategoryId') { newItems[index].itemId = ""; }
    return newItems;
  };

  // Fetches the full transaction (with who prepared it) and downloads or prints its invoice
  const generatePDF = async (txId: string, mode: "download" | "print" = "download") => {
    try {
      const res = await txApi.get(txId);
      await invoicePdf(normalizeTransaction(res.transaction), mode);
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
  ].map(([name, data]: [string, any]) => [name, { id: data.id || data._id || null, name, contact: data.contact || "", tinNo: data.tinNo || "" }])).values());

  const lineTotal = (item: { quantity: string; unitPrice: string }) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);

  const renderItemRows = (formState: typeof formData, setFormState: (f: any) => void) => {
    const grandTotal = formState.items.reduce((s, it) => s + lineTotal(it), 0);
    return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[760px]">
        <div className={cn(LINE_GRID, "border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground")}>
          <div>Category</div>
          <div>Subcategory</div>
          <div>Item</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Unit price</div>
          <div className="text-right">Line total</div>
          <div></div>
        </div>
        <div className="divide-y">
          {formState.items.map((item, index) => (
            <div key={index} className={cn(LINE_GRID, "px-3 py-2")}>
              <Select value={item.categoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'categoryId', v) })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={item.subcategoryId} onValueChange={(v) => setFormState({ ...formState, items: updateFormItem(formState, index, 'subcategoryId', v) })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Subcategory" /></SelectTrigger>
                <SelectContent>{subcategoriesList.filter((s) => !item.categoryId || s.category_id === item.categoryId).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {formState.type === 'purchase' ? (
                <Select value={item.itemId || ""} onValueChange={(v) => {
                  const updates = updateFormItem(formState, index, 'itemId', v);
                  setFormState({ ...formState, items: updates });
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {filteredItemsForRow(item.categoryId, item.subcategoryId).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Button type="button" variant="outline" className="h-9 w-full min-w-0 justify-start gap-2 px-3 text-left text-sm font-normal" title={item.purchaseRef ? `From ${item.purchaseRef}` : undefined} onClick={() => { setItemPickerIndex(index); setItemPickerForm(formState); setItemPickerSearch(""); setItemPickerOpen(true); }}>
                  <span className={cn("truncate", !item.itemId && "text-muted-foreground")}>{item.itemId ? itemsList.find((i) => i.id === item.itemId)?.name || "Selected" : "Select item"}</span>
                  {item.purchaseRef && <span className="ml-auto shrink-0 truncate font-mono text-[11px] text-muted-foreground max-w-[45%]">{item.purchaseRef}</span>}
                </Button>
              )}
              <Input type="number" step="0.01" value={item.quantity} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'quantity', e.target.value) })} placeholder="0" className="h-9 text-right font-mono tabular-nums" />
              <Input type="number" step="0.01" value={item.unitPrice} onChange={(e) => setFormState({ ...formState, items: updateFormItem(formState, index, 'unitPrice', e.target.value) })} placeholder="0.00" className="h-9 text-right font-mono tabular-nums" />
              <div className="text-right font-mono text-sm tabular-nums">{formatMoney(lineTotal(item))}</div>
              <Button type="button" variant="ghost" size="sm" aria-label="Remove line" title="Remove line" onClick={() => setFormState({ ...formState, items: formState.items.filter((_, i) => i !== index) })} disabled={formState.items.length === 1} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setFormState({ ...formState, items: [...formState.items, emptyItem()] })}>
            <Plus className="mr-1.5 h-4 w-4" />Add line
          </Button>
          <div className="flex items-baseline gap-3 pr-10 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-mono font-semibold tabular-nums">{formatMoney(grandTotal)}</span>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const paged = usePaged(filteredTxList, 25);
  const hasFilters = !!(searchTerm || typeFilter !== "all" || startDate || endDate);
  const clearFilters = () => { setSearchTerm(""); setTypeFilter("all"); setStartDate(""); setEndDate(""); };

  const openTxPicker = async (target: "create" | "edit") => {
    const res = await txApi.list(target === "create" ? { limit: "500", type: formData.type } : { limit: "500" });
    setTxPickerAll((res.transactions || []).map(normalizeTransaction));
    setTxPickerTarget(target); setTxPickerSearch(""); setTxPickerOpen(true);
  };

  const copyFromButton = (target: "create" | "edit") => (
    <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" title="Fill this form from an existing transaction" onClick={() => openTxPicker(target)}>Copy from…</Button>
  );

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader
          title="Transactions"
          description="Purchases, sales, transfers and adjustments"
          actions={
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFormData(defaultForm); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" />New transaction</Button></DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New transaction</DialogTitle><DialogDescription>Record a purchase, sale, transfer or adjustment</DialogDescription></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={formData.type} onValueChange={(v: TxType) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="purchase">Purchase</SelectItem><SelectItem value="sale">Sale</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                    <div className="space-y-1.5">
                      <Label>Reference{formData.type === 'transfer' && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}</Label>
                      <div className="flex gap-2">
                        <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder={formData.type === 'transfer' ? "Generated if empty" : "e.g. INV-2026-001"} required={formData.type !== 'transfer'} className="flex-1 font-mono text-sm" />
                        {copyFromButton("create")}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{partyLabel(formData.type)}</Label>
                      <Button type="button" variant="outline" className="h-10 w-full min-w-0 justify-start text-left font-normal" onClick={() => setSupplierModalOpen(true)}>
                        {formData.customerSupplier ? (
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="truncate">{formData.customerSupplier}</span>
                            {formData.tinNo && <span className="shrink-0 text-xs text-muted-foreground">TIN {formData.tinNo}</span>}
                            {formData.contact && <span className="truncate text-xs text-muted-foreground">{formData.contact}</span>}
                          </span>
                        ) : <span className="text-muted-foreground">Select or add a {partyLabel(formData.type).toLowerCase()}…</span>}
                      </Button>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} /></div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Line items</h4>
                    {renderItemRows(formData, setFormData)}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create transaction"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search reference or party" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="tx-from" className="text-xs font-normal text-muted-foreground">From</Label>
              <Input id="tx-from" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="tx-to" className="text-xs font-normal text-muted-foreground">To</Label>
              <Input id="tx-to" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[150px]" />
            </div>
            {hasFilters && <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>Clear</Button>}
            <Button variant="outline" size="sm" className="h-9" onClick={exportToExcel}><Download className="mr-1.5 h-4 w-4" />Export</Button>
          </div>

          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
          ) : filteredTxList.length === 0 ? (
            <div className="py-14 text-center">
              {hasFilters ? <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" /> : <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />}
              <p className="text-sm font-medium">{hasFilters ? "No matching transactions" : "No transactions yet"}</p>
              {hasFilters && <p className="mt-1 text-sm text-muted-foreground">Try a different search or date range</p>}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer / supplier</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.slice.map((tx) => (
                    <TableRow key={tx.id} className="cursor-pointer" onClick={() => setViewTx(tx)}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(tx.transaction_date)}</TableCell>
                      <TableCell><TxTypeBadge type={tx.transaction_type} /></TableCell>
                      <TableCell className="max-w-[260px]"><span className="block truncate font-mono text-xs" title={tx.reference_number}>{tx.reference_number}</span></TableCell>
                      <TableCell className="max-w-[240px]"><span className="block truncate" title={tx.customer_supplier_name || undefined}>{orDash(tx.customer_supplier_name)}</span></TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(tx.total_amount)}</TableCell>
                      <TableCell className="w-10 py-1 pr-2" onClick={(e) => e.stopPropagation()}>
                        <RowActions actions={[
                          { label: "Print invoice", icon: Printer, onSelect: () => generatePDF(tx.id, "print") },
                          { label: "Download PDF", icon: FileText, onSelect: () => generatePDF(tx.id) },
                          { label: "Edit", icon: Pencil, onSelect: () => openEditDialog(tx) },
                          { label: "Delete", icon: Trash2, onSelect: () => setDeleteId(tx.id), danger: true },
                        ]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager {...paged} />
            </>
          )}
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the transaction and reverses its stock changes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingTx(null); }}>
        <DialogContent className={canEditLines ? "max-w-5xl max-h-[90vh] overflow-y-auto" : "max-w-xl"}>
          <DialogHeader>
            <DialogTitle>Edit {editTypeLabel.toLowerCase()}</DialogTitle>
            <DialogDescription>
              {canEditLines
                ? editLinesHint[editType]
                : LINE_EDITABLE.includes(editType)
                  ? "Only an admin can change the line items."
                  : "Line items can't be changed. Delete and recreate the transaction instead."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Reference</Label>
                <div className="flex gap-2">
                  <Input value={editFormData.reference} onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })} required className="flex-1 font-mono text-sm" />
                  {copyFromButton("edit")}
                </div>
              </div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>{partyLabel(editFormData.type)}</Label><Input value={editFormData.customerSupplier} onChange={(e) => setEditFormData({ ...editFormData, customerSupplier: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>TIN</Label><Input value={editFormData.tinNo} onChange={(e) => setEditFormData({ ...editFormData, tinNo: e.target.value })} placeholder="Tax ID" /></div>
              <div className="space-y-1.5"><Label>Contact</Label><Input value={editFormData.contact} onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} rows={2} /></div>
            </div>
            {canEditLines && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Line items</h4>
                {renderItemRows(editFormData, setEditFormData)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={txPickerOpen} onOpenChange={(open) => { if (!open) setTxPickerOpen(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Copy from a transaction</DialogTitle>
            <DialogDescription>{txPickerTarget === "create" ? "Fills the reference, party, date and lines" : "Fills the reference and party"}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search reference, party or type" value={txPickerSearch} onChange={(e) => setTxPickerSearch(e.target.value)} className="h-9 pl-9" autoFocus />
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Customer / supplier</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = (txPickerAll.length > 0 ? txPickerAll : txList).filter((tx) => {
                    if (!txPickerSearch) return true;
                    const t = txPickerSearch.toLowerCase();
                    return tx.reference_number?.toLowerCase().includes(t)
                      || tx.customer_supplier_name?.toLowerCase().includes(t)
                      || tx.transaction_type?.toLowerCase().includes(t);
                  });
                  if (filtered.length === 0) return <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No transactions found</TableCell></TableRow>;
                  return filtered.map((tx) => (
                    <TableRow key={tx.id} className="cursor-pointer" onClick={() => {
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
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(tx.transaction_date)}</TableCell>
                      <TableCell><TxTypeBadge type={tx.transaction_type} /></TableCell>
                      <TableCell className="max-w-[220px]"><span className="block truncate font-mono text-xs" title={tx.reference_number}>{tx.reference_number}</span></TableCell>
                      <TableCell className="max-w-[180px]"><span className="block truncate">{orDash(tx.customer_supplier_name)}</span></TableCell>
                      <TableCell className="text-right">{formatMoney(tx.total_amount)}</TableCell>
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
            <DialogTitle>{itemPickerSelected ? itemPickerSelected.name : "Select item"}</DialogTitle>
            <DialogDescription>{itemPickerSelected ? "Choose the purchase this line draws from" : "Search and choose an item for this line"}</DialogDescription>
          </DialogHeader>
          {itemPickerSelected ? (
            <>
              <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => { setItemPickerSelected(null); setItemPickerStockCard([]); }}>
                <ArrowLeft className="mr-1 h-4 w-4" />Back to items
              </Button>
              {itemPickerStockLoading ? (
                <div className="flex items-center justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div></div>
              ) : itemPickerStockCard.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">No purchase history for this item</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    const newItems = [...itemPickerForm.items];
                    newItems[itemPickerIndex] = { ...newItems[itemPickerIndex], itemId: itemPickerSelected.id, quantity: String(itemPickerSelected.quantity ?? ""), unitPrice: String(itemPickerSelected.cost_price || itemPickerSelected.unit_price || ""), purchaseRef: "" };
                    applyPickedItems(newItems);
                    setItemPickerOpen(false);
                    setItemPickerSelected(null);
                  }}>Use without a purchase reference</Button>
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Purchased</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemPickerStockCard.filter((mv) => mv.quantityIn > 0 && (mv.remaining ?? mv.quantityIn) > 0).map((mv, idx) => (
                        <TableRow key={mv.id || idx} className="cursor-pointer" onClick={() => {
                          const newItems = [...itemPickerForm.items];
                          newItems[itemPickerIndex] = { ...newItems[itemPickerIndex], itemId: itemPickerSelected.id, quantity: String(mv.remaining ?? mv.quantity ?? mv.quantityIn), unitPrice: String(mv.unitPrice), purchaseRef: mv.reference || "" };
                          applyPickedItems(newItems);
                          setItemPickerOpen(false);
                          setItemPickerSelected(null);
                          setItemPickerStockCard([]);
                        }}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(mv.date)}</TableCell>
                          <TableCell className="max-w-[200px]"><span className="block truncate font-mono text-xs" title={mv.reference || undefined}>{orDash(mv.reference)}</span></TableCell>
                          <TableCell className="max-w-[160px]"><span className="block truncate">{orDash(mv.customerSupplier)}</span></TableCell>
                          <TableCell className="text-right">{formatQty(mv.quantity ?? mv.quantityIn)}</TableCell>
                          <TableCell className="text-right">{formatMoney(mv.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{(mv.remaining ?? mv.balance) == null ? "—" : formatQty(mv.remaining ?? mv.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name, SKU or category" value={itemPickerSearch} onChange={(e) => setItemPickerSearch(e.target.value)} className="h-9 pl-9" autoFocus />
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">In stock</TableHead>
                      <TableHead className="text-right">Cost price</TableHead>
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
                      if (filtered.length === 0) return <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No items found</TableCell></TableRow>;
                      return filtered.map((inv) => (
                        <TableRow key={inv.id} className="cursor-pointer" onClick={async () => {
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
                          <TableCell className="font-medium">{inv.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{orDash(inv.sku)}</TableCell>
                          <TableCell className="text-muted-foreground">{orDash(inv.categories?.name)}</TableCell>
                          <TableCell className="text-right">{formatQty(inv.quantity)}</TableCell>
                          <TableCell className="text-right">{formatMoney(inv.cost_price)}</TableCell>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewTx && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">Transaction details <TxTypeBadge type={viewTx.transaction_type} /></DialogTitle>
                <DialogDescription className="break-all font-mono text-xs">{viewTx.reference_number}</DialogDescription>
              </DialogHeader>

              <TxDetailsBlock tx={viewTx} />

              {viewTx.items?.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  <TxLinesTable tx={viewTx} />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => generatePDF(viewTx.id, "print")}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
                <Button variant="outline" size="sm" onClick={() => generatePDF(viewTx.id)}><FileText className="mr-1.5 h-4 w-4" />PDF</Button>
                <Button variant="outline" size="sm" onClick={() => { setViewTx(null); openEditDialog(viewTx); }}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
                <Button variant="outline" size="sm" onClick={() => setViewTx(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select {partyLabel(formData.type).toLowerCase()}</DialogTitle>
            <DialogDescription>Choose one or add a new {partyLabel(formData.type).toLowerCase()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name" id="supplier-modal-search" className="h-9 pl-9" onChange={(e) => {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('[data-supplier-row]').forEach((row) => {
                  const name = (row as HTMLElement).dataset.supplierName || "";
                  (row as HTMLElement).style.display = name.toLowerCase().includes(val) ? "" : "none";
                });
              }} />
            </div>
            <div className="max-h-[30vh] divide-y overflow-y-auto rounded-lg border">
              {uniqueSuppliers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet. Add one below.</p>
              ) : uniqueSuppliers.map((s) => (
                <div
                  key={s.name}
                  data-supplier-row
                  data-supplier-name={s.name}
                  className="px-3 py-2"
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
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="min-w-0 flex-1 cursor-pointer hover:text-primary"
                        onClick={() => {
                          setFormData({ ...formData, customerSupplier: s.name, tinNo: s.tinNo || "", contact: s.contact || "" });
                          setSupplierModalOpen(false);
                        }}
                      >
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        {(s.tinNo || s.contact) && (
                          <div className="truncate text-xs text-muted-foreground">
                            {s.tinNo ? `TIN ${s.tinNo}` : ""}{s.tinNo && s.contact ? " · " : ""}{s.contact || ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {formData.customerSupplier === s.name && <Badge variant="success" className="mr-1">Selected</Badge>}
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" aria-label="Edit" title="Edit" onClick={async (e) => {
                          e.stopPropagation();
                          let supplierId = s.id;
                          if (!supplierId) {
                            try {
                              const res = await suppliersApi.create({ name: s.name, tin_no: s.tinNo || "", contact: s.contact || "" });
                              supplierId = res.supplier?._id || res.supplier?.id;
                              fetchAll();
                            } catch (err: any) {
                              toast({ variant: "destructive", title: "Error", description: "Failed to register supplier: " + err.message });
                              return;
                            }
                          }
                          setEditingSupplier({ ...s, id: supplierId });
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
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium">New {partyLabel(formData.type).toLowerCase()}</h4>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Name" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                <Input placeholder="TIN" value={newSupplierTin} onChange={(e) => setNewSupplierTin(e.target.value)} />
                <Input placeholder="Contact" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} />
              </div>
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={handleCreateAndSelectSupplier} disabled={!newSupplierName.trim()}>Add and select</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Transactions;
