import { useEffect, useState } from "react";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRightLeft, TrendingUp, DollarSign, Package, FileText, Pencil, Trash2 } from "lucide-react";
import jsPDF from "jspdf";

const CostSheet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editForm, setEditForm] = useState({ reference: "", date: "", customerSupplier: "", contact: "", tinNo: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchTransactions();
  }, [debouncedSearch, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "1000" };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "all") params.type = typeFilter;
      else params.type = "transfer,sale";
      const res = await txApi.list(params);
      setTransactions((res.transactions || []).map(normalizeTransaction));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const totalCost = transactions.reduce((sum, tx) =>
    sum + (tx.items || []).reduce((s: number, li: any) => s + (li.unit_price || 0) * (li.quantity || 0), 0), 0
  );
  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
  const totalClients = new Set(transactions.map((tx) => tx.customer_supplier_name).filter(Boolean)).size;

  const filteredTransactions = transactions;

  const getItemsSummary = (tx: any) => {
    const items = tx.items || [];
    if (items.length === 0) return "-";
    if (items.length === 1) return items[0].items?.name || "Unknown";
    return `${items.length} items`;
  };

  const openEdit = (tx: any) => {
    setEditingTx(tx);
    setEditForm({
      reference: tx.reference_number || "",
      date: tx.transaction_date ? new Date(tx.transaction_date).toISOString().split("T")[0] : "",
      customerSupplier: tx.customer_supplier_name || "",
      contact: tx.customer_supplier_contact || "",
      tinNo: tx.tin_no || tx.tinNo || "",
      notes: tx.notes || "",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSubmitting(true);
    try {
      await txApi.update(editingTx.id, {
        transactionDate: editForm.date,
        referenceNumber: editForm.reference,
        customerSupplierName: editForm.customerSupplier,
        customerSupplierContact: editForm.contact || null,
        tinNo: editForm.tinNo || null,
        notes: editForm.notes || null,
      });
      toast({ title: "Success", description: "Transaction updated" });
      setEditingTx(null);
      fetchTransactions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error updating transaction", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await txApi.delete(deleteId);
      toast({ title: "Success", description: "Transaction deleted and stock reversed" });
      setDeleteId(null);
      fetchTransactions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const generatePDF = (tx: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("COST SHEET", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Type: ${tx.transaction_type?.toUpperCase()}`, 20, 30);
    doc.text(`Reference: ${tx.reference_number}`, 20, 37);
    doc.text(`Date: ${new Date(tx.transaction_date).toLocaleDateString()}`, 20, 44);
    doc.text(`Client/Supplier: ${tx.customer_supplier_name || "-"}`, 20, 51);
    if (tx.customer_supplier_contact) doc.text(`Contact: ${tx.customer_supplier_contact}`, 20, 58);
    if (tx.tin_no) doc.text(`TIN: ${tx.tin_no}`, 20, 65);

    let y = 78;
    doc.setFontSize(10);
    doc.text("Item", 20, y); doc.text("SKU", 90, y); doc.text("Qty", 120, y); doc.text("Unit Price", 140, y); doc.text("Total", 170, y);
    y += 5; doc.line(20, y, 190, y); y += 7;

    for (const li of tx.items || []) {
      doc.text(li.items?.name || "Unknown", 20, y);
      doc.text(li.items?.sku || "-", 90, y);
      doc.text(String(li.quantity), 120, y);
      doc.text(`ETB ${(li.unit_price || 0).toFixed(2)}`, 140, y);
      doc.text(`ETB ${(li.total_price || 0).toFixed(2)}`, 170, y);
      y += 7;
    }

    y += 5; doc.line(20, y, 190, y); y += 7;
    doc.setFontSize(11);
    doc.text(`Total: ETB ${(tx.total_amount || 0).toLocaleString()}`, 140, y);

    doc.save(`cost-sheet-${tx.reference_number}.pdf`);
    toast({ title: "PDF generated" });
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

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cost Sheet</h2>
          <p className="text-sm text-muted-foreground">Track transfers and sales to clients</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Transfers & sales</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">Clients served</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">At cost price</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">ETB {totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">At selling price</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search client, reference..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Transfers & Sales</SelectItem>
                    <SelectItem value="transfer">Transfers Only</SelectItem>
                    <SelectItem value="sale">Sales Only</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || typeFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setTypeFilter("all"); }}>Clear</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Cost Sheet</CardTitle>
            <CardDescription>All transfers and sales with cost and revenue details</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-sm text-muted-foreground">No transfers or sales match your criteria</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-9 text-xs">Date</TableHead>
                      <TableHead className="h-9 text-xs">Reference</TableHead>
                      <TableHead className="h-9 text-xs">Client/Supplier</TableHead>
                      <TableHead className="h-9 text-xs">Contact</TableHead>
                      <TableHead className="h-9 text-xs">Items</TableHead>
                      <TableHead className="h-9 text-xs text-right">Total Qty</TableHead>
                      <TableHead className="h-9 text-xs text-right">Cost</TableHead>
                      <TableHead className="h-9 text-xs text-right">Revenue</TableHead>
                      <TableHead className="h-9 text-xs">Type</TableHead>
                      <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const cost = (tx.items || []).reduce((s: number, li: any) => s + (li.unit_price || 0) * (li.quantity || 0), 0);
                      const qty = (tx.items || []).reduce((s: number, li: any) => s + (li.quantity || 0), 0);
                      return (
                        <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/transactions/${tx.id}`)}>
                          <TableCell className="text-xs py-2">{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono text-xs py-2">{tx.reference_number}</TableCell>
                          <TableCell className="text-sm py-2 font-medium">{tx.customer_supplier_name || "-"}</TableCell>
                          <TableCell className="text-xs py-2">{tx.customer_supplier_contact || "-"}</TableCell>
                          <TableCell className="text-xs py-2">{getItemsSummary(tx)}</TableCell>
                          <TableCell className="text-right text-xs py-2 font-medium">{qty}</TableCell>
                          <TableCell className="text-right text-xs py-2">ETB {cost.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs py-2 font-medium">ETB {(tx.total_amount || 0).toLocaleString()}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={tx.transaction_type === 'transfer' ? 'outline' : 'default'} className="text-xs">
                              {tx.transaction_type?.charAt(0).toUpperCase() + tx.transaction_type?.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => openEdit(tx)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="PDF" onClick={() => generatePDF(tx)}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" title="Delete" onClick={() => setDeleteId(tx.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
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

      <Dialog open={!!editingTx} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Transaction</DialogTitle>
            <DialogDescription>Update reference, client info, and notes</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Reference Number *</Label>
              <Input value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Transaction Date *</Label><Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Contact</Label><Input value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Client/Customer</Label><Input value={editForm.customerSupplier} onChange={(e) => setEditForm({ ...editForm, customerSupplier: e.target.value })} /></div>
              <div className="space-y-1"><Label>TIN No</Label><Input value={editForm.tinNo} onChange={(e) => setEditForm({ ...editForm, tinNo: e.target.value })} placeholder="Tax ID" /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingTx(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>This will reverse the stock changes and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default CostSheet;
