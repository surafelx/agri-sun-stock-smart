import { useEffect, useState } from "react";
import { users as usersApi, categories as categoriesApi, suppliers as suppliersApi, transactions as txApi, normalizeUser, normalizeCategory, normalizeSubcategory } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Shield, Plus, Trash2, Tag, Pencil, Search, Truck, RefreshCw } from "lucide-react";
import { stockBalance as sbApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [subcategoriesList, setSubcategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newUserForm, setNewUserForm] = useState({ fullName: "", email: "", password: "", role: "inventory_clerk" as string });
  const [editUserForm, setEditUserForm] = useState({ fullName: "", email: "", role: "inventory_clerk" as string });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editSubcategoryOpen, setEditSubcategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editSubcategoryName, setEditSubcategoryName] = useState("");
  const [editSubcategoryCategoryId, setEditSubcategoryCategoryId] = useState("");

  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [txSuppliersList, setTxSuppliersList] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editSupplierOpen, setEditSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: "", tin_no: "", contact: "", address: "", notes: "" });
  const [editSupplierForm, setEditSupplierForm] = useState({ name: "", tin_no: "", contact: "", address: "", notes: "" });

  useEffect(() => {
    if (me?.role !== 'admin') { navigate('/'); return; }
    fetchAll();
  }, [me]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserSearch(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    if (me?.role === 'admin') fetchUsers();
  }, [debouncedUserSearch, roleFilter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchCategories(), fetchSuppliers(), fetchTxSuppliers()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const params: Record<string, string> = { limit: "500" };
    if (debouncedUserSearch) params.search = debouncedUserSearch;
    if (roleFilter !== "all") params.role = roleFilter;
    const res = await usersApi.list(params);
    setUsersList((res.users || []).map(normalizeUser));
  };

  const fetchCategories = async () => {
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
  };

  const fetchSuppliers = async () => {
    try {
      const params: Record<string, string> = { limit: "500" };
      if (supplierSearch) params.search = supplierSearch;
      const res = await suppliersApi.list(params);
      setSuppliersList(res.suppliers || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error fetching suppliers", description: err.message });
    }
  };

  const fetchTxSuppliers = async () => {
    try {
      const res = await txApi.list({ limit: "1000" });
      const txs = res.transactions || [];
      const supplierMap = new Map<string, { name: string; contact: string; tinNo: string }>();
      txs.forEach((tx: any) => {
        const name = tx.customerSupplierName || tx.customer_supplier_name;
        if (name && !supplierMap.has(name)) {
          supplierMap.set(name, {
            name,
            contact: tx.customerSupplierContact || tx.customer_supplier_contact || "",
            tinNo: tx.tinNo || tx.tin_no || "",
          });
        }
      });
      setTxSuppliersList(Array.from(supplierMap.values()));
    } catch (err: any) {
      console.error("Failed to fetch transaction suppliers:", err);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierForm.name.trim()) { toast({ variant: "destructive", title: "Error", description: "Name is required" }); return; }
    try {
      await suppliersApi.create(newSupplierForm);
      toast({ title: "Success", description: "Supplier created" });
      setSupplierDialogOpen(false);
      setNewSupplierForm({ name: "", tin_no: "", contact: "", address: "", notes: "" });
      fetchSuppliers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleEditSupplier = (s: any) => {
    setEditingSupplier(s);
    setEditSupplierForm({ name: s.name || "", tin_no: s.tin_no || "", contact: s.contact || "", address: s.address || "", notes: s.notes || "" });
    setEditSupplierOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;
    try {
      await suppliersApi.update(editingSupplier.id, editSupplierForm);
      toast({ title: "Success", description: "Supplier updated" });
      setEditSupplierOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await suppliersApi.delete(id);
      toast({ title: "Deleted", description: "Supplier deleted" });
      fetchSuppliers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleImportTxSupplier = async (txSupplier: any) => {
    try {
      await suppliersApi.create({
        name: txSupplier.name,
        tin_no: txSupplier.tinNo || "",
        contact: txSupplier.contact || "",
        address: "",
        notes: "Imported from transactions",
      });
      toast({ title: "Success", description: `Supplier "${txSupplier.name}" imported` });
      fetchSuppliers();
      fetchTxSuppliers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleCreateUser = async () => {
    try {
      await usersApi.create({ fullName: newUserForm.fullName, email: newUserForm.email, password: newUserForm.password, role: newUserForm.role });
      toast({ title: "Success", description: "User created" });
      setUserDialogOpen(false);
      setNewUserForm({ fullName: "", email: "", password: "", role: "inventory_clerk" });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditUserForm({ fullName: user.full_name || user.fullName || "", email: user.email, role: user.role });
    setEditUserOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      await usersApi.update(editingUser.id, { fullName: editUserForm.fullName, email: editUserForm.email, role: editUserForm.role });
      toast({ title: "Success", description: "User updated" });
      setEditUserOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await usersApi.delete(id);
      toast({ title: "Success", description: "User deleted" });
      fetchUsers();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleAddCategory = async () => {
    try {
      await categoriesApi.create(newCategoryName);
      toast({ title: "Success", description: "Category added" });
      setCategoryDialogOpen(false);
      setNewCategoryName("");
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleAddSubcategory = async () => {
    try {
      await categoriesApi.createSubcategory(selectedCategoryId, newSubcategoryName);
      toast({ title: "Success", description: "Subcategory added" });
      setSubcategoryDialogOpen(false);
      setNewSubcategoryName("");
      setSelectedCategoryId("");
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete category and all its subcategories?")) return;
    try {
      await categoriesApi.delete(id);
      toast({ title: "Success", description: "Category deleted" });
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDeleteSubcategory = async (sub: any) => {
    try {
      await categoriesApi.deleteSubcategory(sub.category_id, sub.id);
      toast({ title: "Success", description: "Subcategory deleted" });
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await categoriesApi.update(editingCategory.id, editCategoryName);
      toast({ title: "Success", description: "Category updated" });
      setEditCategoryOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleSaveSubcategory = async () => {
    if (!editingSubcategory) return;
    try {
      await categoriesApi.updateSubcategory(editSubcategoryCategoryId, editingSubcategory.id, editSubcategoryName);
      toast({ title: "Success", description: "Subcategory updated" });
      setEditSubcategoryOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const roleColor = (role: string) => {
    if (role === 'admin') return 'destructive';
    if (role === 'accountant') return 'default';
    return 'secondary';
  };

  const filteredUsers = usersList;

  const filteredCategories = categoriesList.filter((c) => {
    if (!categorySearch) return true;
    return c.name?.toLowerCase().includes(categorySearch.toLowerCase());
  });

  const filteredSubcategories = subcategoriesList.filter((s) => {
    if (!categorySearch) return true;
    return s.name?.toLowerCase().includes(categorySearch.toLowerCase()) || s.categories?.name?.toLowerCase().includes(categorySearch.toLowerCase());
  });

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
        <div><h2 className="text-2xl font-bold">Admin Settings</h2><p className="text-sm text-muted-foreground">Manage users and system configuration</p></div>

        <Tabs defaultValue="users" className="space-y-3">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Categories</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5"><Truck className="h-3.5 w-3.5" />Suppliers</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />User Management</CardTitle><CardDescription className="text-sm">Manage system users and roles</CardDescription></div>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add User</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Create User</DialogTitle><DialogDescription>Add a new system user</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1"><Label>Full Name</Label><Input value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Password</Label><Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="Min 6 chars" /></div>
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateUser}>Create</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name, email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="flex gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                    {(userSearch || roleFilter !== "all") && (
                      <Button variant="ghost" size="sm" onClick={() => { setUserSearch(""); setRoleFilter("all"); }}>Clear</Button>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Name</TableHead>
                        <TableHead className="h-9 text-xs">Email</TableHead>
                        <TableHead className="h-9 text-xs">Role</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                        <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                      ) : filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm py-2 font-medium">{u.full_name || u.fullName}</TableCell>
                          <TableCell className="text-sm py-2">{u.email}</TableCell>
                          <TableCell className="py-2"><Badge variant={roleColor(u.role)} className="text-xs capitalize">{u.role}</Badge></TableCell>
                          <TableCell className="py-2"><Badge variant={u.is_active || u.isActive ? "secondary" : "outline"} className="text-xs">{(u.is_active || u.isActive) ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(u)} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id)} className="h-7 w-7 p-0" disabled={u.id === me?.id}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Full Name</Label><Input value={editUserForm.fullName} onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Email</Label><Input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={editUserForm.role} onValueChange={(v) => setEditUserForm({ ...editUserForm, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                        <SelectItem value="accountant">Accountant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditUserOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveUser}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ── Categories Tab ── */}
          <TabsContent value="categories">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search categories, subcategories..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="pl-9" />
              </div>
              {categorySearch && (
                <Button variant="ghost" size="sm" onClick={() => setCategorySearch("")}>Clear</Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categories */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div><CardTitle className="text-base">Categories</CardTitle><CardDescription className="text-sm">{categoriesList.length} categories</CardDescription></div>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1"><Label>Name</Label><Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /></div>
                        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button><Button onClick={handleAddCategory}>Add</Button></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader><TableRow><TableHead className="h-9 text-xs">Name</TableHead><TableHead className="h-9 text-xs text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredCategories.length === 0 ? (
                          <TableRow><TableCell colSpan={2} className="text-center py-6 text-muted-foreground text-sm">No categories found</TableCell></TableRow>
                        ) : filteredCategories.map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="text-sm py-2">{cat.name}</TableCell>
                            <TableCell className="text-right py-2">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingCategory(cat); setEditCategoryName(cat.name); setEditCategoryOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Subcategories */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div><CardTitle className="text-base">Subcategories</CardTitle><CardDescription className="text-sm">{subcategoriesList.length} subcategories</CardDescription></div>
                  <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Subcategory</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Parent Category</Label>
                          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label>Name</Label><Input value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} /></div>
                        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>Cancel</Button><Button onClick={handleAddSubcategory}>Add</Button></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader><TableRow><TableHead className="h-9 text-xs">Name</TableHead><TableHead className="h-9 text-xs">Category</TableHead><TableHead className="h-9 text-xs text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredSubcategories.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No subcategories found</TableCell></TableRow>
                        ) : filteredSubcategories.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="text-sm py-2">{sub.name}</TableCell>
                            <TableCell className="text-sm py-2 text-muted-foreground">{sub.categories?.name || '-'}</TableCell>
                            <TableCell className="text-right py-2">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingSubcategory(sub); setEditSubcategoryName(sub.name); setEditSubcategoryCategoryId(sub.category_id); setEditSubcategoryOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSubcategory(sub)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Name</Label><Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditCategoryOpen(false)}>Cancel</Button><Button onClick={handleSaveCategory}>Save</Button></div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={editSubcategoryOpen} onOpenChange={setEditSubcategoryOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Subcategory</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Parent Category</Label>
                    <Select value={editSubcategoryCategoryId} onValueChange={setEditSubcategoryCategoryId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categoriesList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Name</Label><Input value={editSubcategoryName} onChange={(e) => setEditSubcategoryName(e.target.value)} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditSubcategoryOpen(false)}>Cancel</Button><Button onClick={handleSaveSubcategory}>Save</Button></div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={editSupplierOpen} onOpenChange={setEditSupplierOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Name</Label><Input value={editSupplierForm.name} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>TIN No</Label><Input value={editSupplierForm.tin_no} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, tin_no: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Contact</Label><Input value={editSupplierForm.contact} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, contact: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Address</Label><Input value={editSupplierForm.address} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, address: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Notes</Label><Input value={editSupplierForm.notes} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditSupplierOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveSupplier}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="suppliers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" />Supplier Registry</CardTitle><CardDescription className="text-sm">Manage suppliers with TIN and contact info</CardDescription></div>
                <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Supplier</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Supplier</DialogTitle><DialogDescription>Add a new supplier to the registry</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1"><Label>Name *</Label><Input value={newSupplierForm.name} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })} required /></div>
                      <div className="space-y-1"><Label>TIN No</Label><Input value={newSupplierForm.tin_no} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, tin_no: e.target.value })} placeholder="Tax identification number" /></div>
                      <div className="space-y-1"><Label>Contact</Label><Input value={newSupplierForm.contact} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact: e.target.value })} placeholder="Phone or email" /></div>
                      <div className="space-y-1"><Label>Address</Label><Input value={newSupplierForm.address} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })} placeholder="Address" /></div>
                      <div className="space-y-1"><Label>Notes</Label><Input value={newSupplierForm.notes} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, notes: e.target.value })} placeholder="Additional notes" /></div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSupplier}>Create</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search suppliers by name, TIN, contact..." value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); }} className="pl-9" />
                </div>
                {(() => {
                  const registeredNames = new Set(suppliersList.map((s) => s.name?.toLowerCase()));
                  const unregisteredTxSuppliers = txSuppliersList.filter((ts) => !registeredNames.has(ts.name?.toLowerCase()));
                  const filteredRegistered = suppliersList.filter((s) => !supplierSearch || s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || s.tin_no?.toLowerCase().includes(supplierSearch.toLowerCase()) || s.contact?.toLowerCase().includes(supplierSearch.toLowerCase()));
                  const filteredUnregistered = unregisteredTxSuppliers.filter((ts) => !supplierSearch || ts.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || ts.tinNo?.toLowerCase().includes(supplierSearch.toLowerCase()) || ts.contact?.toLowerCase().includes(supplierSearch.toLowerCase()));
                  return (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-9 text-xs">Name</TableHead>
                            <TableHead className="h-9 text-xs">TIN No</TableHead>
                            <TableHead className="h-9 text-xs">Contact</TableHead>
                            <TableHead className="h-9 text-xs">Address</TableHead>
                            <TableHead className="h-9 text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRegistered.length === 0 && filteredUnregistered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">No suppliers found</TableCell></TableRow>
                          ) : (
                            <>
                              {filteredRegistered.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="text-sm py-2 font-medium">{s.name}</TableCell>
                                  <TableCell className="text-sm py-2 font-mono">{s.tin_no || '-'}</TableCell>
                                  <TableCell className="text-sm py-2">{s.contact || '-'}</TableCell>
                                  <TableCell className="text-sm py-2 text-muted-foreground">{s.address || '-'}</TableCell>
                                  <TableCell className="text-right py-2">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEditSupplier(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteSupplier(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {filteredUnregistered.length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-2 px-3 bg-muted/50">
                                    <span className="text-xs font-medium text-muted-foreground">From Transactions ({filteredUnregistered.length})</span>
                                  </TableCell>
                                </TableRow>
                              )}
                              {filteredUnregistered.map((ts, idx) => (
                                <TableRow key={`tx-${idx}`} className="bg-muted/30">
                                  <TableCell className="text-sm py-2 font-medium">
                                    {ts.name}
                                    <Badge variant="outline" className="ml-2 text-[10px] h-4">Transaction</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm py-2 font-mono">{ts.tinNo || '-'}</TableCell>
                                  <TableCell className="text-sm py-2">{ts.contact || '-'}</TableCell>
                                  <TableCell className="text-sm py-2 text-muted-foreground">-</TableCell>
                                  <TableCell className="text-right py-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleImportTxSupplier(ts)}>
                                      <Plus className="h-3 w-3 mr-1" />Import
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
