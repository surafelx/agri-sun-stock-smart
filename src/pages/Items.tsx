import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Edit, Trash2, FileText, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Category { id: string; name: string; }
interface Subcategory { id: string; name: string; category_id: string; }
interface Item {
  id: string; name: string; sku: string; category_id: string | null; subcategory_id: string | null;
  cost_price: number; description: string; supplier: string; parameters: any;
  low_stock_threshold: number; uom: string | null;
  categories?: { name: string }; subcategories?: { name: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StockOverviewItem = Record<string, any>;

const Items = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [stockOverview, setStockOverview] = useState<StockOverviewItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"items" | "stock">("items");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "", sku: "", category_id: "", subcategory_id: "", description: "",
    supplier: "", low_stock_threshold: "10", uom: "", wattage: "", voltage: "", capacity: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    if (viewMode === "stock") fetchStockOverview();
    else fetchItems();
  }, [viewMode, selectedCategory]);

  const fetchItems = async () => {
    try {
      let query = (supabase as any).from('items')
        .select('*, categories(name), subcategories(name)').order('created_at', { ascending: false });
      if (selectedCategory && selectedCategory !== "all") query = query.eq('category_id', selectedCategory);
      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
      setLoading(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error fetching items", description: error.message });
      setLoading(false);
    }
  };

  const fetchStockOverview = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('stock_overview').select('*').order('Category', { ascending: true }).order('Stock_Code', { ascending: true });
      if (error) throw error;
      let filtered = data || [];
      if (selectedCategory && selectedCategory !== "all") {
        const catName = categories.find(c => c.id === selectedCategory)?.name;
        if (catName) filtered = filtered.filter((i: StockOverviewItem) => i.Category === catName);
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((i: StockOverviewItem) => 
          i.Stock_Code?.toLowerCase().includes(term) ||
          i.Item_Name?.toLowerCase().includes(term) ||
          i.Category?.toLowerCase().includes(term) ||
          i.Subcategory?.toLowerCase().includes(term)
        );
      }
      setStockOverview(filtered);
      setLoading(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error fetching stock overview", description: error.message });
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await (supabase as any).from('categories').select('*').order('name');
      setCategories(data || []);
    } catch {}
  };

  const fetchSubcategories = async () => {
    try {
      const { data } = await (supabase as any).from('subcategories').select('*').order('name');
      setSubcategories(data || []);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const itemData: any = {
        name: formData.name, sku: formData.sku, category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null, description: formData.description,
        supplier: formData.supplier, low_stock_threshold: parseFloat(formData.low_stock_threshold),
        uom: formData.uom || null, parameters: { wattage: formData.wattage, voltage: formData.voltage, capacity: formData.capacity },
        created_by: user.id,
      };
      if (editingItem) {
        const { error } = await supabase.from('items').update(itemData).eq('id', editingItem.id);
        if (error) throw error;
        toast({ title: "Success", description: "Item updated" });
      } else {
        const { error } = await supabase.from('items').insert([itemData]);
        if (error) throw error;
        toast({ title: "Success", description: "Item created" });
      }
      setDialogOpen(false);
      resetForm();
      fetchItems();
      fetchStockOverview();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Item deleted" });
      fetchItems();
      fetchStockOverview();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const resetForm = () => {
    setFormData({ name: "", sku: "", category_id: "", subcategory_id: "", description: "", supplier: "", low_stock_threshold: "10", uom: "", wattage: "", voltage: "", capacity: "" });
    setEditingItem(null);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name, sku: item.sku, category_id: item.category_id || "", subcategory_id: item.subcategory_id || "",
      description: item.description || "", supplier: item.supplier || "", low_stock_threshold: item.low_stock_threshold.toString(),
      uom: item.uom || "", wattage: item.parameters?.wattage || "", voltage: item.parameters?.voltage || "", capacity: item.parameters?.capacity || "",
    });
    setDialogOpen(true);
  };

  const totalBalance = stockOverview.reduce((sum: number, item: StockOverviewItem) => sum + (item.Current_Balance || 0), 0);
  const totalValue = stockOverview.reduce((sum: number, item: StockOverviewItem) => sum + (item.Total_Value || 0), 0);
  const lowStockCount = stockOverview.filter((item: StockOverviewItem) => item.Stock_Status === "Low Stock").length;

  const formatCurrency = (value: number) => "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                    <div className="space-y-1"><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-9" /></div>
                    <div className="space-y-1"><Label>SKU *</Label><Input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} required className="h-9" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value, subcategory_id: ""})}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategory</Label>
                      <Select value={formData.subcategory_id} onValueChange={(value) => setFormData({...formData, subcategory_id: value})}>
                        <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                        <SelectContent>
                          {subcategories.filter(s => !formData.category_id || s.category_id === formData.category_id).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>UOM</Label><Input value={formData.uom} onChange={(e) => setFormData({...formData, uom: e.target.value})} placeholder="e.g., Pcs" /></div>
                    <div className="space-y-2"><Label>Low Stock Threshold</Label><Input type="number" step="0.01" value={formData.low_stock_threshold} onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})} /></div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Parameters (Optional)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Wattage</Label><Input value={formData.wattage} onChange={(e) => setFormData({...formData, wattage: e.target.value})} placeholder="e.g., 300W" /></div>
                      <div className="space-y-2"><Label>Voltage</Label><Input value={formData.voltage} onChange={(e) => setFormData({...formData, voltage: e.target.value})} placeholder="e.g., 24V" /></div>
                      <div className="space-y-2"><Label>Capacity</Label><Input value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} placeholder="e.g., 200Ah" /></div>
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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                {(searchTerm || (selectedCategory && selectedCategory !== "all")) && <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}>Clear</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        {viewMode === "stock" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-card"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{stockOverview.length}</p></CardContent></Card>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Inventory Items</CardTitle><CardDescription className="text-sm">{items.length} items</CardDescription></CardHeader>
            <CardContent className="pt-0">
              {items.length === 0 ? (
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
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
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
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/stock-card/${item.id}`)} className="h-7 w-7 p-0"><FileText className="h-3.5 w-3.5" /></Button>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Stock Overview</CardTitle><CardDescription className="text-sm">{stockOverview.length} items</CardDescription></CardHeader>
            <CardContent className="pt-0">
              {stockOverview.length === 0 ? (
                <div className="text-center py-8"><Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><h3 className="text-base font-semibold mb-1">No stock data</h3></div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Stock Code</TableHead>
                        <TableHead className="h-9 text-xs">Item Name</TableHead>
                        <TableHead className="h-9 text-xs">Category</TableHead>
                        <TableHead className="h-9 text-xs">Subcategory</TableHead>
                        <TableHead className="h-9 text-xs text-right">Balance</TableHead>
                        <TableHead className="h-9 text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="h-9 text-xs text-right">Total Value</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockOverview.map((item: StockOverviewItem) => (
                        <TableRow key={item.item_id}>
                          <TableCell className="font-mono text-xs py-2">{item.Stock_Code || "-"}</TableCell>
                          <TableCell className="font-medium text-sm py-2">
                            <button onClick={() => navigate(`/stock-card/${item.item_id}`)} className="hover:text-primary hover:underline text-left">{item.Item_Name}</button>
                          </TableCell>
                          <TableCell className="text-sm py-2">{item.Category || "-"}</TableCell>
                          <TableCell className="text-sm py-2">{item.Subcategory || "-"}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">{(item.Current_Balance || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right text-sm py-2">{formatCurrency(item.Unit_Cost || 0)}</TableCell>
                          <TableCell className="text-right text-sm py-2 font-medium">{formatCurrency(item.Total_Value || 0)}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant={item.Stock_Status === "In Stock" ? "secondary" : item.Stock_Status === "Low Stock" ? "destructive" : "outline"} className="text-xs">
                              {item.Stock_Status}
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
