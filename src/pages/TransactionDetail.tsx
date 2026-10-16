import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, Pencil, Trash2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { invoicePdf } from "@/lib/invoicePdf";
import PageHeader from "@/components/app/PageHeader";
import { TxTypeBadge } from "@/components/app/Badges";
import { partyLabel, TxDetailsBlock, TxLinesTable } from "@/components/app/TransactionBlocks";

const TransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ reference: "", date: "", customerSupplier: "", contact: "", tinNo: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (transactionId) {
      txApi.get(transactionId)
        .then((res) => setTransaction(normalizeTransaction(res.transaction)))
        .catch((err) => toast({ variant: "destructive", title: "Error fetching transaction", description: err.message }))
        .finally(() => setLoading(false));
    }
  }, [transactionId]);

  const openEdit = () => {
    setEditForm({
      reference: transaction.reference_number || "",
      date: transaction.transaction_date ? new Date(transaction.transaction_date).toISOString().split("T")[0] : "",
      customerSupplier: transaction.customer_supplier_name || "",
      contact: transaction.customer_supplier_contact || "",
      tinNo: transaction.tin_no || transaction.tinNo || "",
      notes: transaction.notes || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId) return;
    setSubmitting(true);
    try {
      await txApi.update(transactionId, {
        transactionDate: editForm.date,
        referenceNumber: editForm.reference,
        customerSupplierName: editForm.customerSupplier,
        customerSupplierContact: editForm.contact || null,
        tinNo: editForm.tinNo || null,
        notes: editForm.notes || null,
      });
      const res = await txApi.get(transactionId);
      setTransaction(normalizeTransaction(res.transaction));
      toast({ title: "Success", description: "Transaction updated" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionId) return;
    try {
      await txApi.delete(transactionId);
      toast({ title: "Success", description: "Transaction deleted and stock reversed" });
      setDeleteOpen(false);
      navigate('/transactions');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const makeInvoice = (mode: "download" | "print") =>
    invoicePdf(transaction, mode).catch((err: any) => toast({ variant: "destructive", title: "Error generating PDF", description: err.message }));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <h2 className="mb-3 text-xl font-semibold">Transaction not found</h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/transactions')}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to transactions</Button>
        </div>
      </Layout>
    );
  }

  const label = partyLabel(transaction.transaction_type);

  return (
    <Layout>
      <div className="space-y-5">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground print:hidden" onClick={() => navigate(-1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
        <PageHeader
          title={<span className="flex flex-wrap items-center gap-2.5">Transaction details <TxTypeBadge type={transaction.transaction_type} /></span>}
          description={<span className="break-all font-mono text-xs">{transaction.reference_number}</span>}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => makeInvoice("print")}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
              <Button variant="outline" size="sm" onClick={() => makeInvoice("download")}><FileText className="mr-1.5 h-4 w-4" />Download PDF</Button>
              {/* Admins edit purchases, sales and transfers in the full editor, which can change the lines too */}
              <Button variant="outline" size="sm" onClick={() => user?.role === 'admin' && ['purchase', 'sale', 'transfer'].includes(transaction.transaction_type)
                ? navigate(`/transactions?edit=${transactionId}`) : openEdit()}><Pencil className="mr-1.5 h-4 w-4" />Edit</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
            </>
          }
        />

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent><TxDetailsBlock tx={transaction} /></CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-base">Line items</CardTitle></CardHeader>
          <div className="border-t">
            {(transaction.items || []).length === 0
              ? <p className="py-10 text-center text-sm text-muted-foreground">No line items</p>
              : <TxLinesTable tx={transaction} />}
          </div>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>Reference, party and notes. Line items stay as they are.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Reference</Label><Input value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} required className="font-mono text-sm" /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>{label}</Label><Input value={editForm.customerSupplier} onChange={(e) => setEditForm({ ...editForm, customerSupplier: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>TIN</Label><Input value={editForm.tinNo} onChange={(e) => setEditForm({ ...editForm, tinNo: e.target.value })} placeholder="Tax ID" /></div>
              <div className="space-y-1.5"><Label>Contact</Label><Input value={editForm.contact} onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
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

export default TransactionDetail;
