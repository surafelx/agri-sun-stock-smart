import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, LayoutDashboard, Package, ArrowLeftRight, Settings, BarChart3, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = () => {
    logout();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/auth");
  };

  const isActiveRoute = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center shadow-glow">
              <Sun className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold">Agrisun Ethiopia</h1>
              <p className="text-[10px] text-muted-foreground">Inventory Management</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { path: "/", label: "Dashboard", Icon: LayoutDashboard },
              { path: "/items", label: "Stock Items", Icon: Package },
              { path: "/stock-balance", label: "Stock Balance", Icon: BarChart3 },
              { path: "/transactions", label: "Transactions", Icon: ArrowLeftRight },
              { path: "/cost-sheet", label: "Cost Sheet", Icon: FileText },
              { path: "/import", label: "Import", Icon: Upload },
              { path: "/admin", label: "Admin", Icon: Settings },
            ].map(({ path, label, Icon }) => (
              <Button
                key={path}
                variant={isActiveRoute(path) ? "default" : "ghost"}
                size="sm"
                onClick={() => navigate(path)}
                className="h-8 text-xs"
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user.email}
              {user.role !== 'inventory_clerk' && (
                <span className="ml-1 text-[10px] text-primary capitalize">({user.role})</span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 text-xs">
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">{children}</main>
    </div>
  );
};

export default Layout;
