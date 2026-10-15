import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Sun, LayoutDashboard, Package, ArrowLeftRight, Settings, BarChart3, Upload, FileText, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

const NAV = [
  { section: "Overview", links: [{ path: "/", label: "Dashboard", Icon: LayoutDashboard }] },
  {
    section: "Inventory",
    links: [
      { path: "/items", label: "Stock Items", Icon: Package },
      { path: "/stock-balance", label: "Stock Balance", Icon: BarChart3 },
      { path: "/transactions", label: "Transactions", Icon: ArrowLeftRight },
      { path: "/cost-sheet", label: "Cost Sheet", Icon: FileText },
    ],
  },
  {
    section: "Manage",
    links: [
      { path: "/import", label: "Import", Icon: Upload },
      { path: "/admin", label: "Admin", Icon: Settings },
    ],
  },
];

// The app frame, after Celerus Pay: an ink sidebar with a notch of accent beside the current page,
// a slim top bar, and the work on a warm light canvas. On small screens the sidebar slides in.
const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [location.pathname]);

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

  const current = NAV.flatMap((g) => g.links.map((l) => ({ ...l, section: g.section }))).find((l) => isActiveRoute(l.path));
  const initials = (user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden print:hidden" onClick={() => setMenuOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[#232327] bg-[#17171a] text-[#a1a1aa] transition-transform duration-150 print:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-[52px] shrink-0 items-center gap-2.5 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Sun className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-semibold text-[#fafafa]">Agrisun Ethiopia</div>
            <div className="truncate text-[11px] text-[#63636c]">Inventory Management</div>
          </div>
          <button className="ml-auto rounded-md p-1 text-[#a1a1aa] hover:bg-[#222226] hover:text-white md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#63636c]">{group.section}</div>
              <ul className="space-y-0.5">
                {group.links.map(({ path, label, Icon }) => {
                  const active = isActiveRoute(path);
                  return (
                    <li key={path}>
                      <button
                        onClick={() => navigate(path)}
                        className={cn(
                          "relative flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
                          active ? "bg-[#2a2a2f] text-[#fafafa]" : "hover:bg-[#222226] hover:text-[#fafafa]",
                        )}
                      >
                        {/* The notch: a short bar of accent on the sidebar's edge beside the current page */}
                        {active && <span className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-primary" />}
                        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-[#63636c]")} />
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-[#232327] p-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2a2f] text-[11px] font-semibold text-[#fafafa]">{initials}</div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs text-[#fafafa]">{user.email}</div>
              <div className="truncate text-[11px] capitalize text-[#63636c]">{String(user.role || "").replace(/_/g, " ")}</div>
            </div>
            <button onClick={handleSignOut} className="rounded-md p-1.5 text-[#a1a1aa] hover:bg-[#222226] hover:text-white" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-60 print:pl-0">
        <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b bg-background/85 px-4 backdrop-blur print:hidden md:px-6">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </Button>
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            {current && <span className="hidden text-muted-foreground sm:inline">{current.section}</span>}
            {current && <span className="hidden text-muted-foreground/60 sm:inline">/</span>}
            <span className="truncate font-medium">{current?.label ?? "Agrisun Ethiopia"}</span>
          </nav>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 print:max-w-none print:p-0">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
