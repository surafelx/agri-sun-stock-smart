import { useEffect, useState } from "react";
import { users as usersApi, categories as categoriesApi, suppliers as suppliersApi, transactions as txApi, normalizeUser, normalizeCategory, normalizeSubcategory } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import PageHeader from "@/components/app/PageHeader";
import RowActions from "@/components/app/RowActions";
import { RoleBadge } from "@/components/app/Badges";
import { orDash } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Trash2, Tag, Pencil, Search, Truck } from "lucide-react";
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const roleOptions = (
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="inventory_clerk">Inventory clerk</SelectItem>
      <SelectItem value="accountant">Accountant</SelectItem>
    </SelectContent>
  );
  const emptyRow = (colSpan: number, text: string) => (
    <TableRow className="hover:bg-transparent"><TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">{text}</TableCell></TableRow>
  );
  const toolbar = "flex flex-wrap items-center gap-2 border-b p-3";

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Admin" description="Users, categories and suppliers" />

        <Tabs defaultValue="users" className="space-y-3">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" />Categories</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5"><Truck className="h-3.5 w-3.5" />Suppliers</TabsTrigger>
          </TabsList>

          {/* ── Users ── */}
          <TabsContent value="users" className="mt-0">
            <Card className="overflow-hidden">
              <div className={toolbar}>
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search name or email" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="h-9 pl-9" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="inventory_clerk">Inventory clerk</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                  </SelectContent>
                </Select>
                {(userSearch || roleFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setUserSearch(""); setRoleFilter("all"); }}>Clear</Button>
                )}
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild><Button size="sm" className="ml-auto"><Plus className="h-4 w-4" />Add user</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add user</DialogTitle><DialogDescription>They sign in with this email and password.</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1"><Label>Full name</Label><Input value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Email</Label><Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Password</Label><Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="At least 6 characters" /></div>
                      <div className="space-y-1">
                        <Label>Role</Label>
                        <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          {roleOptions}
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateUser}>Create</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? emptyRow(5, "No users found") : filteredUsers.map((u) => {
                    const active = u.is_active || u.isActive;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || u.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell><RoleBadge role={u.role} /></TableCell>
                        <TableCell><Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="py-1.5">
                          <RowActions
                            actions={[
                              { label: "Edit", icon: Pencil, onSelect: () => handleEditUser(u) },
                              { label: "Delete", icon: Trash2, onSelect: () => handleDeleteUser(u.id), danger: true, hidden: u.id === me?.id },
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── Categories ── */}
          <TabsContent value="categories" className="mt-0">
            <Card className="overflow-hidden">
              <div className={toolbar}>
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search categories and subcategories" value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="h-9 pl-9" />
                </div>
                {categorySearch && (
                  <Button variant="ghost" size="sm" onClick={() => setCategorySearch("")}>Clear</Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4" />Subcategory</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add subcategory</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Parent category</Label>
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
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" />Category</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div className="space-y-1"><Label>Name</Label><Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /></div>
                        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button><Button onClick={handleAddCategory}>Add</Button></div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid md:grid-cols-2 md:divide-x">
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between border-b px-3 py-2">
                    <h3 className="text-sm font-semibold">Categories</h3>
                    <span className="font-mono text-xs text-muted-foreground">{categoriesList.length}</span>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-10"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredCategories.length === 0 ? emptyRow(2, "No categories found") : filteredCategories.map((cat) => (
                        <TableRow key={cat.id}>
                          <TableCell>{cat.name}</TableCell>
                          <TableCell className="py-1.5">
                            <RowActions
                              actions={[
                                { label: "Rename", icon: Pencil, onSelect: () => { setEditingCategory(cat); setEditCategoryName(cat.name); setEditCategoryOpen(true); } },
                                { label: "Delete", icon: Trash2, onSelect: () => handleDeleteCategory(cat.id), danger: true },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="min-w-0 border-t md:border-t-0">
                  <div className="flex items-baseline justify-between border-b px-3 py-2">
                    <h3 className="text-sm font-semibold">Subcategories</h3>
                    <span className="font-mono text-xs text-muted-foreground">{subcategoriesList.length}</span>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="w-10"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredSubcategories.length === 0 ? emptyRow(3, "No subcategories found") : filteredSubcategories.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell className="text-muted-foreground">{orDash(sub.categories?.name)}</TableCell>
                          <TableCell className="py-1.5">
                            <RowActions
                              actions={[
                                { label: "Edit", icon: Pencil, onSelect: () => { setEditingSubcategory(sub); setEditSubcategoryName(sub.name); setEditSubcategoryCategoryId(sub.category_id); setEditSubcategoryOpen(true); } },
                                { label: "Delete", icon: Trash2, onSelect: () => handleDeleteSubcategory(sub), danger: true },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ── Suppliers ── */}
          <TabsContent value="suppliers" className="mt-0">
            <Card className="overflow-hidden">
              <div className={toolbar}>
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search name, TIN or contact" value={supplierSearch} onChange={(e) => { setSupplierSearch(e.target.value); }} className="h-9 pl-9" />
                </div>
                {supplierSearch && (
                  <Button variant="ghost" size="sm" onClick={() => setSupplierSearch("")}>Clear</Button>
                )}
                <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                  <DialogTrigger asChild><Button size="sm" className="ml-auto"><Plus className="h-4 w-4" />Add supplier</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add supplier</DialogTitle><DialogDescription>Saved suppliers can be picked on purchases.</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1"><Label>Name *</Label><Input value={newSupplierForm.name} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })} required /></div>
                      <div className="space-y-1"><Label>TIN no.</Label><Input value={newSupplierForm.tin_no} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, tin_no: e.target.value })} placeholder="Tax identification number" /></div>
                      <div className="space-y-1"><Label>Contact</Label><Input value={newSupplierForm.contact} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact: e.target.value })} placeholder="Phone or email" /></div>
                      <div className="space-y-1"><Label>Address</Label><Input value={newSupplierForm.address} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })} /></div>
                      <div className="space-y-1"><Label>Notes</Label><Input value={newSupplierForm.notes} onChange={(e) => setNewSupplierForm({ ...newSupplierForm, notes: e.target.value })} /></div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSupplier}>Create</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {(() => {
                const registeredNames = new Set(suppliersList.map((s) => s.name?.toLowerCase()));
                const unregisteredTxSuppliers = txSuppliersList.filter((ts) => !registeredNames.has(ts.name?.toLowerCase()));
                const filteredRegistered = suppliersList.filter((s) => !supplierSearch || s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || s.tin_no?.toLowerCase().includes(supplierSearch.toLowerCase()) || s.contact?.toLowerCase().includes(supplierSearch.toLowerCase()));
                const filteredUnregistered = unregisteredTxSuppliers.filter((ts) => !supplierSearch || ts.name?.toLowerCase().includes(supplierSearch.toLowerCase()) || ts.tinNo?.toLowerCase().includes(supplierSearch.toLowerCase()) || ts.contact?.toLowerCase().includes(supplierSearch.toLowerCase()));
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>TIN no.</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistered.length === 0 && filteredUnregistered.length === 0 ? emptyRow(5, "No suppliers found") : (
                        <>
                          {filteredRegistered.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell className="font-mono text-xs">{orDash(s.tin_no)}</TableCell>
                              <TableCell>{orDash(s.contact)}</TableCell>
                              <TableCell className="text-muted-foreground">{orDash(s.address)}</TableCell>
                              <TableCell className="py-1.5">
                                <RowActions
                                  actions={[
                                    { label: "Edit", icon: Pencil, onSelect: () => handleEditSupplier(s) },
                                    { label: "Delete", icon: Trash2, onSelect: () => handleDeleteSupplier(s.id), danger: true },
                                  ]}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                          {filteredUnregistered.length > 0 && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={5} className="bg-muted/50 py-2">
                                <span className="text-xs font-medium text-muted-foreground">Seen on transactions, not yet saved · {filteredUnregistered.length}</span>
                              </TableCell>
                            </TableRow>
                          )}
                          {filteredUnregistered.map((ts, idx) => (
                            <TableRow key={`tx-${idx}`}>
                              <TableCell className="font-medium">
                                {ts.name}
                                <Badge variant="neutral" className="ml-2">From transactions</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{orDash(ts.tinNo)}</TableCell>
                              <TableCell>{orDash(ts.contact)}</TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                              <TableCell className="py-1.5 text-right">
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleImportTxSupplier(ts)}>
                                  <Plus className="h-3 w-3" />Save
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                );
              })()}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit dialogs live outside the tabs so they open from any tab */}
        <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Full name</Label><Input value={editUserForm.fullName} onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={editUserForm.role} onValueChange={(v) => setEditUserForm({ ...editUserForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  {roleOptions}
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditUserOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveUser}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rename category</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditCategoryOpen(false)}>Cancel</Button><Button onClick={handleSaveCategory}>Save</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editSubcategoryOpen} onOpenChange={setEditSubcategoryOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit subcategory</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Parent category</Label>
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
            <DialogHeader><DialogTitle>Edit supplier</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editSupplierForm.name} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>TIN no.</Label><Input value={editSupplierForm.tin_no} onChange={(e) => setEditSupplierForm({ ...editSupplierForm, tin_no: e.target.value })} /></div>
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
      </div>
    </Layout>
  );
};

export default Admin;
