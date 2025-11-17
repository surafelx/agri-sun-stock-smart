import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Package, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  supplier: string;
  parameters: any;
  low_stock_threshold: number;
}

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    quantity: "",
    unit_price: "",
    supplier: "",
    low_stock_threshold: "10",
    wattage: "",
    voltage: "",
    capacity: "",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching items",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const itemData = {
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        supplier: formData.supplier,
        low_stock_threshold: parseFloat(formData.low_stock_threshold),
        parameters: {
          wattage: formData.wattage,
          voltage: formData.voltage,
          capacity: formData.capacity,
        },
        created_by: user.id,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Item updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('items')
          .insert([itemData]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Item created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving item",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
      fetchItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting item",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      description: "",
      quantity: "",
      unit_price: "",
      supplier: "",
      low_stock_threshold: "10",
      wattage: "",
      voltage: "",
      capacity: "",
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description || "",
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      supplier: item.supplier || "",
      low_stock_threshold: item.low_stock_threshold.toString(),
      wattage: item.parameters?.wattage || "",
      voltage: item.parameters?.voltage || "",
      capacity: item.parameters?.capacity || "",
    });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Stock Cards</h2>
            <p className="text-sm text-muted-foreground">Manage your solar equipment inventory</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription className="text-sm">
                  {editingItem ? "Update the item details below" : "Enter the details for the new inventory item"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-sm">Item Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sku" className="text-sm">SKU/Code *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Solar Panels, Inverters, Batteries"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Unit Price (ETB) *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="threshold">Low Stock Threshold</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="0.01"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Item Parameters (Optional)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wattage">Wattage (W)</Label>
                      <Input
                        id="wattage"
                        value={formData.wattage}
                        onChange={(e) => setFormData({ ...formData, wattage: e.target.value })}
                        placeholder="e.g., 300W"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voltage">Voltage (V)</Label>
                      <Input
                        id="voltage"
                        value={formData.voltage}
                        onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                        placeholder="e.g., 24V"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity (Ah)</Label>
                      <Input
                        id="capacity"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        placeholder="e.g., 200Ah"
                      />
                    </div>
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
                  <Button type="submit">
                    {editingItem ? "Update Item" : "Create Item"}
                  </Button>
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
              <CardTitle className="text-base">Inventory Items</CardTitle>
              <CardDescription className="text-sm">All stock items in your inventory</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">No items yet</h3>
                  <p className="text-sm text-muted-foreground mb-3">Get started by adding your first inventory item</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">SKU</TableHead>
                        <TableHead className="h-9 text-xs">Name</TableHead>
                        <TableHead className="h-9 text-xs">Category</TableHead>
                        <TableHead className="h-9 text-xs">Quantity</TableHead>
                        <TableHead className="h-9 text-xs">Unit Price</TableHead>
                        <TableHead className="h-9 text-xs">Total Value</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                        <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs py-2">{item.sku}</TableCell>
                          <TableCell className="font-medium text-sm py-2">{item.name}</TableCell>
                          <TableCell className="text-sm py-2">{item.category}</TableCell>
                          <TableCell className="text-sm py-2">{item.quantity}</TableCell>
                          <TableCell className="text-sm py-2">ETB {item.unit_price}</TableCell>
                          <TableCell className="text-sm py-2">ETB {(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="py-2">
                            {item.quantity <= item.low_stock_threshold ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertTriangle className="h-3 w-3" />
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="h-7 w-7 p-0"
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
    </Layout>
  );
};

export default Items;
