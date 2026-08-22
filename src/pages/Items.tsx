import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { items as itemsApi, categories as categoriesApi, normalizeItem, normalizeCategory, normalizeSubcategory, stockBalance } from "@/lib/api";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, FileText, Search, Filter, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Items = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [balanceList, setBalanceList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [colSearch, setColSearch] = useState({ sku: "", name: "", category: "", subcategory: "", uom: "" });
  const [viewMode, setViewMode] = useState<"items" | "stock">("items");
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
    if (viewMode === "stock") fetchBalance();
    else fetchItems();
  }, [viewMode, selectedCategory, selectedSubcategory, debouncedSearch]);

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

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "1000" };
      if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
      if (selectedSubcategory && selectedSubcategory !== "all") params.subcategory = selectedSubcategory;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await stockBalance.list(params);
      setBalanceList(res.balances || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching stock", description: err.message });
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
      fetchBalance();
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
      fetchBalance();
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

  const formatCurrency = (v: number) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filteredItems = itemsList.filter((item) => {
    const matchStatus = (() => {
      if (statusFilter === "all") return true;
      const qty = item.quantity ?? 0;
      const threshold = item.low_stock_threshold ?? 10;
      if (statusFilter === "in_stock") return qty > threshold;
      if (statusFilter === "low_stock") return qty > 0 && qty <= threshold;
      if (statusFilter === "out_of_stock") return qty === 0;
      return true;
    })();
    const matchCol = (!colSearch.sku || item.sku?.toLowerCase().includes(colSearch.sku.toLowerCase()))
      && (!colSearch.name || item.name?.toLowerCase().includes(colSearch.name.toLowerCase()))
      && (!colSearch.category || item.categories?.name?.toLowerCase().includes(colSearch.category.toLowerCase()))
      && (!colSearch.subcategory || item.subcategories?.name?.toLowerCase().includes(colSearch.subcategory.toLowerCase()))
      && (!colSearch.uom || item.uom?.toLowerCase().includes(colSearch.uom.toLowerCase()));
    return matchStatus && matchCol;
  });

  const filteredBalance = balanceList.filter((b) => {
    if (statusFilter === "all") return true;
    const qty = b.quantity ?? 0;
    if (statusFilter === "in_stock") return qty > 0 && !b.isLowStock;
    if (statusFilter === "low_stock") return b.isLowStock && qty > 0;
    if (statusFilter === "out_of_stock") return qty === 0;
    return true;
  });

  const totalBalance = filteredBalance.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalValue = filteredBalance.reduce((s, i) => s + (i.inventoryValue || 0), 0);
  const lowStockCount = filteredBalance.filter((i) => i.isLowStock).length;

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{viewMode === "items" ? "Stock Items" : "Stock Overview"}</h2>
            <p className="text-sm text-muted-foreground">{viewMode === "items" ? "Manage inventory" : "View balances and values"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant={viewMode === "items" ? "default" : "outline"} size="sm" onClick={() => setViewMode("items")}>Items</Button>
            <Button variant={viewMode === "stock" ? "default" : "outline"} size="sm" onClick={() => setViewMode("stock")}>Overview</Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Add Item</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
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
                    <div className="space-y-2"><Label>Low Stock Threshold</Label><Input type="number" step="0.01" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} /></div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Parameters (Optional)</h4>
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
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search SKU, name, category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Filter className="h-4 w-4 text-muted-foreground mt-3" />
                <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory("all"); }}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedCategory !== "all" && (
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Subcategories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {subcategoriesList.filter((s) => s.category_id === selectedCategory).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || selectedCategory !== "all" || selectedSubcategory !== "all" || statusFilter !== "all" || Object.values(colSearch).some(Boolean)) && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSelectedCategory("all"); setSelectedSubcategory("all"); setStatusFilter("all"); setColSearch({ sku: "", name: "", category: "", subcategory: "", uom: "" }); }}>Clear</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "stock" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-card"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{filteredBalance.length}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Quantity</p><p className="text-2xl font-bold">{totalBalance.toLocaleString()}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-2xl font-bold text-orange-500">{lowStockCount}</p></CardContent></Card>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === "items" ? (
          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Inventory Items</CardTitle><CardDescription className="text-sm">{filteredItems.length} items</CardDescription></CardHeader>
            <CardContent className="pt-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8"><Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No items</h3></div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">SKU</TableHead>
                        <TableHead className="h-9 text-xs">Name</TableHead>
                        <TableHead className="h-9 text-xs">Category</TableHead>
                        <TableHead className="h-9 text-xs">Subcategory</TableHead>
                        <TableHead className="h-9 text-xs">UOM</TableHead>
                        <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className="py-1 px-1">
                          <Input placeholder="Filter SKU..." value={colSearch.sku} onChange={(e) => setColSearch({ ...colSearch, sku: e.target.value })} className="h-7 text-xs" />
                        </TableHead>
                        <TableHead className="py-1 px-1">
                          <Input placeholder="Filter name..." value={colSearch.name} onChange={(e) => setColSearch({ ...colSearch, name: e.target.value })} className="h-7 text-xs" />
                        </TableHead>
                        <TableHead className="py-1 px-1">
                          <Input placeholder="Filter category..." value={colSearch.category} onChange={(e) => setColSearch({ ...colSearch, category: e.target.value })} className="h-7 text-xs" />
                        </TableHead>
                        <TableHead className="py-1 px-1">
                          <Input placeholder="Filter subcategory..." value={colSearch.subcategory} onChange={(e) => setColSearch({ ...colSearch, subcategory: e.target.value })} className="h-7 text-xs" />
                        </TableHead>
                        <TableHead className="py-1 px-1">
                          <Input placeholder="Filter UOM..." value={colSearch.uom} onChange={(e) => setColSearch({ ...colSearch, uom: e.target.value })} className="h-7 text-xs" />
                        </TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs py-2">{item.sku}</TableCell>
                          <TableCell className="font-medium text-sm py-2">
                            <button onClick={() => navigate(`/stock-card/${item.id}`)} className="hover:text-primary hover:underline text-left">{item.name}</button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{item.categories?.name || "N/A"}</TableCell>
                          <TableCell className="text-sm py-2">{item.subcategories?.name || "N/A"}</TableCell>
                          <TableCell className="text-sm py-2">{item.uom || "N/A"}</TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/stock-card/${item.id}`)} className="h-7 w-7 p-0" title="Stock Card"><FileText className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/transfer-card/${item.id}`)} className="h-7 w-7 p-0" title="Transfer Cost Sheet"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)} className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 w-7 p-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
        ) : (
          <Card className="shadow-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Stock Overview</CardTitle><CardDescription className="text-sm">{filteredBalance.length} items</CardDescription></CardHeader>
            <CardContent className="pt-0">
              {filteredBalance.length === 0 ? (
                <div className="text-center py-8"><Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No stock data</h3></div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">SKU</TableHead>
                        <TableHead className="h-9 text-xs">Name</TableHead>
                        <TableHead className="h-9 text-xs">Category</TableHead>
                        <TableHead className="h-9 text-xs text-right">Balance</TableHead>
                        <TableHead className="h-9 text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="h-9 text-xs text-right">Total Value</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBalance.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs py-2">{item.sku}</TableCell>
                          <TableCell className="font-medium text-sm py-2">
                            <button onClick={() => navigate(`/stock-card/${item.id}`)} className="hover:text-primary hover:underline text-left">{item.name}</button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{item.category?.name || "-"}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">{(item.quantity || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm py-2">{formatCurrency(item.costPrice || 0)}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">{formatCurrency(item.inventoryValue || 0)}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={item.isLowStock ? "destructive" : "secondary"} className="text-xs">
                              {item.quantity === 0 ? "Out of Stock" : item.isLowStock ? "Low Stock" : "In Stock"}
                            </Badge>
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
    </Layout>
  );
};

export default Items;
