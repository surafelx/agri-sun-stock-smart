import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
import { Settings, Users, FileText, Shield, Plus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name: string;
  };
}

interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
  };
}

const Admin = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "inventory_clerk" | "accountant">("inventory_clerk");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRoles();
    fetchCategories();
    fetchSubcategories();
  }, []);

  const fetchUserRoles = async () => {
    try {
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Merge the data
      const mergedData = rolesData?.map(role => ({
        ...role,
        profiles: profilesData?.find(profile => profile.id === role.user_id)
      })) || [];

      setUserRoles(mergedData);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching user roles",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching categories",
        description: error.message,
      });
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('subcategories')
        .select('*, categories(name)')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching subcategories",
        description: error.message,
      });
    }
  };

  const handleAddUserRole = async () => {
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (profileError || !profiles) {
        toast({
          variant: "destructive",
          title: "User not found",
          description: "No user found with this email address",
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: profiles.id,
          role: newUserRole,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role added successfully",
      });

      setDialogOpen(false);
      setNewUserEmail("");
      setNewUserRole("inventory_clerk");
      fetchUserRoles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding user role",
        description: error.message,
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User role removed successfully",
      });

      fetchUserRoles();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing role",
        description: error.message,
      });
    }
  };

  const handleAddCategory = async () => {
    try {
      const { error } = await (supabase as any)
        .from('categories')
        .insert([{ name: newCategoryName }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category added successfully",
      });

      setCategoryDialogOpen(false);
      setNewCategoryName("");
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding category",
        description: error.message,
      });
    }
  };

  const handleAddSubcategory = async () => {
    try {
      const { error } = await (supabase as any)
        .from('subcategories')
        .insert([{ name: newSubcategoryName, category_id: selectedCategoryId }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory added successfully",
      });

      setSubcategoryDialogOpen(false);
      setNewSubcategoryName("");
      setSelectedCategoryId("");
      fetchSubcategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error adding subcategory",
        description: error.message,
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category removed successfully",
      });

      fetchCategories();
      fetchSubcategories(); // Refresh subcategories as they might be deleted
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing category",
        description: error.message,
      });
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory removed successfully",
      });

      fetchSubcategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error removing subcategory",
        description: error.message,
      });
    }
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
          <h2 className="text-2xl font-bold">Admin Settings</h2>
          <p className="text-sm text-muted-foreground">Manage users, roles, and system configuration</p>
        </div>

        <Tabs defaultValue="users" className="space-y-3">
           <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
             <TabsTrigger value="users" className="text-sm">
               <Users className="w-4 h-4 mr-1" />
               Users & Roles
             </TabsTrigger>
             <TabsTrigger value="categories" className="text-sm">
               <Tag className="w-4 h-4 mr-1" />
               Categories
             </TabsTrigger>
           </TabsList>

          <TabsContent value="users" className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">User Roles</CardTitle>
                    <CardDescription className="text-sm">Manage user access and permissions</CardDescription>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Role
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add User Role</DialogTitle>
                        <DialogDescription>
                          Assign a role to a user by their email address
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-sm">User Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="user@example.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="role" className="text-sm">Role</Label>
                          <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                            <SelectTrigger id="role" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                              <SelectItem value="accountant">Accountant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddUserRole}>
                          Add Role
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9">User</TableHead>
                        <TableHead className="h-9">Email</TableHead>
                        <TableHead className="h-9">Role</TableHead>
                        <TableHead className="h-9 w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.map((userRole) => (
                        <TableRow key={userRole.id}>
                          <TableCell className="py-2 font-medium">
                            {userRole.profiles?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell className="py-2 text-sm">
                            {userRole.profiles?.email || "N/A"}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs">
                              {userRole.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                              {userRole.role.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(userRole.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Role Permissions</CardTitle>
                <CardDescription className="text-sm">Overview of what each role can do</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Admin</Badge>
                    <p className="text-muted-foreground">Full access to all features including user management and system settings</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Inventory Clerk</Badge>
                    <p className="text-muted-foreground">Can create, update items and transactions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">Accountant</Badge>
                    <p className="text-muted-foreground">Can view all data and generate reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Categories</CardTitle>
                    <CardDescription className="text-sm">Manage product categories</CardDescription>
                  </div>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                        <DialogDescription>
                          Create a new product category
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <div className="space-y-1">
                          <Label htmlFor="categoryName" className="text-sm">Category Name</Label>
                          <Input
                            id="categoryName"
                            placeholder="e.g., Electronics"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddCategory}>
                          Add Category
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9">Category Name</TableHead>
                        <TableHead className="h-9 w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="py-2 font-medium">
                            {category.name}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Subcategories</CardTitle>
                    <CardDescription className="text-sm">Manage product subcategories</CardDescription>
                  </div>
                  <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Subcategory
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Subcategory</DialogTitle>
                        <DialogDescription>
                          Create a new product subcategory
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <div className="space-y-1">
                          <Label htmlFor="subcategoryName" className="text-sm">Subcategory Name</Label>
                          <Input
                            id="subcategoryName"
                            placeholder="e.g., Smartphones"
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="categorySelect" className="text-sm">Category</Label>
                          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                            <SelectTrigger id="categorySelect" className="h-9">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSubcategoryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddSubcategory}>
                          Add Subcategory
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9">Subcategory Name</TableHead>
                        <TableHead className="h-9">Category</TableHead>
                        <TableHead className="h-9 w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subcategories.map((subcategory) => (
                        <TableRow key={subcategory.id}>
                          <TableCell className="py-2 font-medium">
                            {subcategory.name}
                          </TableCell>
                          <TableCell className="py-2 text-sm">
                            {subcategory.categories?.name || "N/A"}
                          </TableCell>
                          <TableCell className="py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubcategory(subcategory.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
