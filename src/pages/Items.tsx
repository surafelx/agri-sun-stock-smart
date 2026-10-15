import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { items as itemsApi, categories as categoriesApi, normalizeItem, normalizeCategory, normalizeSubcategory } from "@/lib/api";
import Layout from "@/components/Layout";
import { PrintHeader, PrintButton } from "@/components/PrintHeader";
import ExportDialog from "@/components/ExportDialog";
import PageHeader from "@/components/app/PageHeader";
import RowActions from "@/components/app/RowActions";
import { usePaged, Pager } from "@/components/app/Pager";
import { StockStatusBadge } from "@/components/app/Badges";
import { formatQty, orDash } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Edit, Trash2, FileText, Search, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Items = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "", sku: "", category_id: "", subcategory_id: "", description: "",
    supplier: "", low_stock_threshold: "10", uom: "", wattage: "", voltage: "", capacity: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory, selectedSubcategory, debouncedSearch]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "1000" };
      if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
      if (selectedSubcategory && selectedSubcategory !== "all") params.subcategory = selectedSubcategory;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await itemsApi.list(params);
      setItemsList((res.items || []).map(normalizeItem));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching items", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoriesApi.list();
      const cats = (res.categories || []).map(normalizeCategory);
      setCategoriesList(cats);
      // Fetch all subcategories
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body: any = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category_id || undefined,
        subcategory: formData.subcategory_id || undefined,
        description: formData.description || undefined,
        supplier: formData.supplier || undefined,
        lowStockThreshold: parseFloat(formData.low_stock_threshold),
        uom: formData.uom || undefined,
        parameters: { wattage: formData.wattage, voltage: formData.voltage, capacity: formData.capacity },
      };
      if (editingItem) {
        await itemsApi.update(editingItem.id, body);
        toast({ title: "Success", description: "Item updated" });
      } else {
        await itemsApi.create(body);
        toast({ title: "Success", description: "Item created" });
      }
      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      await itemsApi.delete(id);
      toast({ title: "Success", description: "Item deleted" });
      fetchItems();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", sku: "", category_id: "", subcategory_id: "", description: "", supplier: "", low_stock_threshold: "10", uom: "", wattage: "", voltage: "", capacity: "" });
    setEditingItem(null);
  };

  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name, sku: item.sku, category_id: item.category_id || "", subcategory_id: item.subcategory_id || "",
      description: item.description || "", supplier: item.supplier || "", low_stock_threshold: String(item.low_stock_threshold ?? 10),
      uom: item.uom || "", wattage: item.parameters?.wattage || "", voltage: item.parameters?.voltage || "", capacity: item.parameters?.capacity || "",
    });
    setDialogOpen(true);
  };

  const filteredItems = itemsList.filter((item) => {
    if (statusFilter === "all") return true;
    const qty = item.quantity ?? 0;
    const threshold = item.low_stock_threshold ?? 10;
    if (statusFilter === "in_stock") return qty > threshold;
    if (statusFilter === "low_stock") return qty > 0 && qty <= threshold;
    if (statusFilter === "out_of_stock") return qty === 0;
    return true;
  });

  // Paging is screen-only: rows off the current page stay in the DOM so printing lists them all
  const paged = usePaged(filteredItems, 25);
  const onPage = (idx: number) => idx >= paged.page * paged.pageSize && idx < (paged.page + 1) * paged.pageSize;

  return (
    <Layout>
      <div className="space-y-5">
        <PrintHeader title="Stock List" subtitle={`${filteredItems.length} items`} />
        <PageHeader
          title="Stock items"
          description="Your product catalogue"
          actions={
            <>
              <ExportDialog itemIds={filteredItems.map((i: any) => String(i.id))} />
              <PrintButton />
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Add item</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit item" : "Add item"}</DialogTitle>
                    <DialogDescription>Enter item details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-9" /></div>
                      <div className="space-y-1"><Label>SKU *</Label><Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required className="h-9" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v, subcategory_id: "" })}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Subcategory</Label>
                        <Select value={formData.subcategory_id} onValueChange={(v) => setFormData({ ...formData, subcategory_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                          <SelectContent>
                            {subcategoriesList.filter((s) => !formData.category_id || s.category_id === formData.category_id).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>UOM</Label><Input value={formData.uom} onChange={(e) => setFormData({ ...formData, uom: e.target.value })} placeholder="e.g., Pcs" /></div>
                      <div className="space-y-2"><Label>Low stock threshold</Label><Input type="number" step="0.01" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} /></div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Parameters (optional)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Wattage</Label><Input value={formData.wattage} onChange={(e) => setFormData({ ...formData, wattage: e.target.value })} placeholder="e.g., 300W" /></div>
                        <div className="space-y-2"><Label>Voltage</Label><Input value={formData.voltage} onChange={(e) => setFormData({ ...formData, voltage: e.target.value })} placeholder="e.g., 24V" /></div>
                        <div className="space-y-2"><Label>Capacity</Label><Input value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} placeholder="e.g., 200Ah" /></div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        <Card className="overflow-hidden print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 border-b p-3 print:hidden">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search SKU, name, category" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-9" />
            </div>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory("all"); }}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedCategory !== "all" && (
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="All subcategories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subcategories</SelectItem>
                  {subcategoriesList.filter((s) => s.category_id === selectedCategory).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="in_stock">In stock</SelectItem>
                <SelectItem value="low_stock">Low stock</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || selectedCategory !== "all" || selectedSubcategory !== "all" || statusFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSelectedCategory("all"); setSelectedSubcategory("all"); setStatusFilter("all"); }}>Clear</Button>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">No items found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="print-sheet">
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Subcategory</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10 print:hidden"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, idx) => {
                      const qty = item.quantity ?? 0;
                      return (
                        <TableRow key={item.id} className={onPage(idx) ? undefined : "hidden print:table-row"}>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell className="font-medium">
                            <button onClick={() => navigate(`/stock-card/${item.id}`)} className="text-left hover:text-primary hover:underline">{item.name}</button>
                          </TableCell>
                          <TableCell>{orDash(item.categories?.name)}</TableCell>
                          <TableCell>{orDash(item.subcategories?.name)}</TableCell>
                          <TableCell>{orDash(item.uom)}</TableCell>
                          <TableCell className="text-right">{formatQty(qty)}</TableCell>
                          <TableCell><StockStatusBadge quantity={qty} isLowStock={qty <= (item.low_stock_threshold ?? 10)} /></TableCell>
                          <TableCell className="text-right print:hidden">
                            <RowActions
                              actions={[
                                { label: "Stock card", icon: FileText, onSelect: () => navigate(`/stock-card/${item.id}`) },
                                { label: "Transfer card", icon: ArrowRightLeft, onSelect: () => navigate(`/transfer-card/${item.id}`) },
                                { label: "Edit", icon: Edit, onSelect: () => openEditDialog(item) },
                                { label: "Delete", icon: Trash2, onSelect: () => handleDelete(item.id), danger: true },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pager {...paged} />
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Items;
