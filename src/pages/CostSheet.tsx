import { useEffect, useState } from "react";
import { transactions as txApi, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRightLeft, TrendingUp, DollarSign, Package, FileText, ChevronDown, ChevronRight } from "lucide-react";
import jsPDF from "jspdf";

const CostSheet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

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

  const grouped = transactions.reduce((acc, tx) => {
    const fullRef = tx.reference_number || "No Reference";
    const ref = fullRef.split('/')[0];
    if (!acc[ref]) acc[ref] = { ref, fullRefs: new Set<string>(), txs: [], client: tx.customer_supplier_name, date: tx.transaction_date, type: tx.transaction_type, totalCost: 0, totalRevenue: 0, items: [] };
    acc[ref].fullRefs.add(fullRef);
    acc[ref].txs.push(tx);
    for (const li of tx.items || []) {
      acc[ref].items.push(li);
      acc[ref].totalCost += (li.unit_price || 0) * (li.quantity || 0);
    }
    acc[ref].totalRevenue += tx.total_amount || 0;
    return acc;
  }, {} as Record<string, any>);

  const groups = Object.values(grouped);

  const totalCost = transactions.reduce((sum, tx) =>
    sum + (tx.items || []).reduce((s: number, li: any) => s + (li.unit_price || 0) * (li.quantity || 0), 0), 0
  );
  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
  const totalClients = new Set(transactions.map((tx) => tx.customer_supplier_name).filter(Boolean)).size;

  const toggleRef = (ref: string) => {
    const next = new Set(expandedRefs);
    if (next.has(ref)) next.delete(ref);
    else next.add(ref);
    setExpandedRefs(next);
  };

  const generateGroupPDF = (group: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("COST SHEET", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Reference: ${group.ref}`, 20, 30);
    doc.text(`Type: ${group.type?.toUpperCase()}`, 20, 37);
    doc.text(`Date: ${new Date(group.date).toLocaleDateString()}`, 20, 44);
    doc.text(`Client/Supplier: ${group.client || "-"}`, 20, 51);
    let y = 64;
    doc.setFontSize(10);
    doc.text("Item", 20, y); doc.text("SKU", 90, y); doc.text("Qty", 120, y); doc.text("Unit Price", 140, y); doc.text("Total", 170, y);
    y += 5; doc.line(20, y, 190, y); y += 7;
    for (const li of group.items) {
      doc.text(li.items?.name || "Unknown", 20, y);
      doc.text(li.items?.sku || "-", 90, y);
      doc.text(String(li.quantity), 120, y);
      doc.text(`ETB ${(li.unit_price || 0).toFixed(2)}`, 140, y);
      doc.text(`ETB ${(li.total_price || 0).toFixed(2)}`, 170, y);
      y += 7;
    }
    y += 5; doc.line(20, y, 190, y); y += 7;
    doc.setFontSize(11);
    doc.text(`Total Cost: ETB ${group.totalCost.toLocaleString()}`, 20, y);
    doc.text(`Total Revenue: ETB ${group.totalRevenue.toLocaleString()}`, 120, y);
    doc.save(`cost-sheet-${group.ref}.pdf`);
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
          <p className="text-sm text-muted-foreground">Track transfers and sales grouped by reference</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
              <p className="text-xs text-muted-foreground">By reference</p>
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
                <Button variant="ghost" size="sm" onClick={() => { const all = new Set(groups.map((g) => g.ref)); setExpandedRefs(expandedRefs.size === all.size ? new Set() : all); }}>
                  {expandedRefs.size === groups.length ? "Collapse All" : "Expand All"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Cost Sheet Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-sm text-muted-foreground">No transfers or sales match your criteria</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const isExpanded = expandedRefs.has(group.ref);
                  return (
                    <div key={group.ref} className="border rounded-lg">
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50" onClick={() => toggleRef(group.ref)}>
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <div>
                            <div className="font-mono text-sm font-medium">{group.ref}</div>
                            {group.fullRefs.size > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {Array.from(group.fullRefs).join(' | ')}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">{group.client || "No client"} · {new Date(group.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={group.type === 'transfer' ? 'outline' : 'default'} className="text-xs">
                            {group.type?.charAt(0).toUpperCase() + group.type?.slice(1)}
                          </Badge>
                          <div className="text-right text-sm">
                            <div className="font-medium">ETB {group.totalRevenue.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Cost: ETB {group.totalCost.toLocaleString()}</div>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="PDF" onClick={(e) => { e.stopPropagation(); generateGroupPDF(group); }}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t px-4 py-2">
                          <div className="border rounded-lg overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8 text-xs">Item</TableHead>
                                  <TableHead className="h-8 text-xs">SKU</TableHead>
                                  <TableHead className="h-8 text-xs">Category</TableHead>
                                  <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                                  <TableHead className="h-8 text-xs text-right">Unit Price</TableHead>
                                  <TableHead className="h-8 text-xs text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.items.map((li: any, idx: number) => (
                                  <TableRow key={li.id || idx}>
                                    <TableCell className="text-sm py-1.5">{li.items?.name || "Unknown"}</TableCell>
                                    <TableCell className="font-mono text-xs py-1.5">{li.items?.sku || "-"}</TableCell>
                                    <TableCell className="text-xs py-1.5">{li.items?.categories?.name || "-"}</TableCell>
                                    <TableCell className="text-right text-xs py-1.5 font-medium">{li.quantity}</TableCell>
                                    <TableCell className="text-right text-xs py-1.5">ETB {(li.unit_price || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-xs py-1.5 font-medium">ETB {(li.total_price || 0).toFixed(2)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={3} className="text-xs font-medium py-1.5">Total ({group.items.length} items)</TableCell>
                                  <TableCell className="text-right text-xs font-medium py-1.5">{group.items.reduce((s: number, li: any) => s + (li.quantity || 0), 0)}</TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right text-xs font-bold py-1.5">ETB {group.totalCost.toLocaleString()}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex justify-end mt-2 gap-4 text-sm">
                            <span className="text-muted-foreground">Revenue: <span className="font-bold text-foreground">ETB {group.totalRevenue.toLocaleString()}</span></span>
                            <span className="text-muted-foreground">Profit: <span className={`font-bold ${(group.totalRevenue - group.totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>ETB {(group.totalRevenue - group.totalCost).toLocaleString()}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CostSheet;
