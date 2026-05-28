import { useEffect, useState } from "react";
import { users as usersApi, categories as categoriesApi, normalizeUser, normalizeCategory, normalizeSubcategory } from "@/lib/api";
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
import { Settings, Users, Shield, Plus, Trash2, Tag, Pencil } from "lucide-react";
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

  useEffect(() => {
    if (me?.role !== 'admin') { navigate('/'); return; }
    fetchAll();
  }, [me]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchCategories()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const res = await usersApi.list({ limit: "100" });
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
                      {usersList.map((u) => (
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
                        {categoriesList.map((cat) => (
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
                        {subcategoriesList.map((sub) => (
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
