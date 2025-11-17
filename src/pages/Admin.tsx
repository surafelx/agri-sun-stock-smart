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
import { Settings, Users, FileText, Shield, Plus, Trash2 } from "lucide-react";
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

const Admin = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "inventory_clerk" | "accountant">("inventory_clerk");
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRoles();
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
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching user roles",
        description: error.message,
      });
      setLoading(false);
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="users" className="text-sm">
              <Users className="w-4 h-4 mr-1" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="forms" className="text-sm">
              <FileText className="w-4 h-4 mr-1" />
              Form Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">
              <Settings className="w-4 h-4 mr-1" />
              System Settings
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

          <TabsContent value="forms" className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Form Templates</CardTitle>
                <CardDescription className="text-sm">Manage custom form templates for items and transactions</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Form template designer coming soon</p>
                  <p className="text-xs mt-1">Create custom fields for different product types</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">System Settings</CardTitle>
                <CardDescription className="text-sm">Configure system-wide preferences</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">System configuration coming soon</p>
                  <p className="text-xs mt-1">Manage currencies, tax rates, and business settings</p>
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
