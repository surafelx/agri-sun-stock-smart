import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, User } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, LayoutDashboard, Package, ArrowLeftRight, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 text-xs">
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/items")} className="h-8 text-xs">
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Stock Cards
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="h-8 text-xs">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              Transactions
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="h-8 text-xs">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Admin
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 text-xs">
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {children}
      </main>
    </div>
  );
};

export default Layout;
