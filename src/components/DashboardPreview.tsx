// Simplified dashboard preview for the landing page device mockup
// Uses static mock data — no API calls

import { Package, DollarSign, AlertTriangle, TrendingUp, BarChart3, ArrowDownLeft, ArrowUpLeft, Settings, LayoutDashboard, FolderOpen, ArrowLeftRight, Bell } from "lucide-react";

const mockStats = [
  { label: "Total Items", value: "128", sub: "Unique products", icon: Package, color: "text-primary" },
  { label: "Inventory Value", value: "12.4M", sub: "", icon: DollarSign, color: "text-blue-500" },
  { label: "Low Stock", value: "7", sub: "Need reorder", icon: AlertTriangle, color: "text-amber-500" },
  { label: "Transactions", value: "1,247", sub: "All time", icon: TrendingUp, color: "text-emerald-500" },
];

const mockChartData = [
  { name: "Jan", purchases: 420000, sales: 380000 },
  { name: "Feb", purchases: 510000, sales: 470000 },
  { name: "Mar", purchases: 390000, sales: 440000 },
  { name: "Apr", purchases: 620000, sales: 580000 },
  { name: "May", purchases: 550000, sales: 610000 },
  { name: "Jun", purchases: 710000, sales: 670000 },
];

const mockLowStock = [
  { name: "SP-520W Solar Panel", sku: "SP-520", stock: 3, threshold: 10 },
  { name: "MPPT-40A Controller", sku: "MPPT-CTL-40", stock: 5, threshold: 15 },
  { name: "HDPE Pipe 2\" PN10", sku: "HDPE-PN10-2IN", stock: 8, threshold: 20 },
];

export function DashboardPreview() {
  return (
    <div className="flex h-full w-full bg-background font-sans">
      {/* Sidebar */}
      <div className="w-14 flex-shrink-0 bg-neutral-800 flex flex-col items-center py-3 gap-3 border-r border-neutral-700">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm bg-primary" />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {[
            { icon: LayoutDashboard, active: true },
            { icon: FolderOpen, active: false },
            { icon: ArrowLeftRight, active: false },
            { icon: BarChart3, active: false },
            { icon: Bell, active: false },
            { icon: Settings, active: false },
          ].map(({ icon: Icon, active }, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary/20 text-primary" : "text-neutral-500"}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-11 bg-white border-b border-neutral-200 flex items-center px-4 gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary">AS</span>
          </div>
          <span className="text-xs font-semibold text-neutral-700">AgriSun Inventory</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[7px] font-bold text-primary">S</span>
            </div>
          </div>
        </div>

        {/* Dashboard content (scrollable) */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-neutral-800">Dashboard</div>
              <div className="text-[9px] text-neutral-400">Welcome to your inventory</div>
            </div>
            <div className="w-20 h-5 rounded-md bg-neutral-100" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {mockStats.map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-lg p-2 border border-neutral-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-neutral-500 font-medium">{label}</span>
                  <Icon className={`w-3 h-3 ${color}`} />
                </div>
                <div className="text-sm font-bold text-neutral-800 leading-tight">{value}</div>
                <div className="text-[8px] text-neutral-400">{sub}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Bar chart */}
            <div className="bg-white rounded-lg p-2 border border-neutral-100 shadow-sm">
              <div className="text-[9px] font-semibold text-neutral-700 mb-1">Purchase vs Sales</div>
              {/* Simple SVG bar chart */}
              <div className="flex items-end gap-1 h-16">
                {mockChartData.map(({ name, purchases, sales }) => {
                  const maxVal = 710000;
                  const h1 = (purchases / maxVal) * 56;
                  const h2 = (sales / maxVal) * 56;
                  return (
                    <div key={name} className="flex-1 flex flex-col items-end gap-0.5">
                      <div className="flex-1 w-full flex items-end gap-0.5">
                        <div className="flex-1 bg-primary/60 rounded-t-sm" style={{ height: `${h1}px` }} />
                        <div className="flex-1 bg-blue-400/70 rounded-t-sm" style={{ height: `${h2}px` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-1.5 bg-primary/60 rounded-sm" />
                  <span className="text-[7px] text-neutral-400">Purchases</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-1.5 bg-blue-400/70 rounded-sm" />
                  <span className="text-[7px] text-neutral-400">Sales</span>
                </div>
              </div>
            </div>

            {/* Low stock list */}
            <div className="bg-white rounded-lg p-2 border border-neutral-100 shadow-sm">
              <div className="text-[9px] font-semibold text-neutral-700 mb-1">Low Stock Alerts</div>
              <div className="space-y-1">
                {mockLowStock.map(({ name, sku, stock }) => (
                  <div key={sku} className="flex items-center gap-2 bg-amber-50 rounded px-2 py-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-medium text-neutral-800 truncate">{name}</div>
                      <div className="text-[7px] text-neutral-400">{sku}</div>
                    </div>
                    <div className="text-[9px] font-bold text-amber-500">{stock}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="bg-white rounded-lg p-2 border border-neutral-100 shadow-sm">
            <div className="text-[9px] font-semibold text-neutral-700 mb-1">Recent Transactions</div>
            <div className="space-y-1">
              {[
                { type: "purchase", desc: "SP-520W Solar Panel × 20", amount: "+840,000", date: "Today" },
                { type: "sale", desc: "DC Submersible Pump × 5", amount: "−425,000", date: "Yesterday" },
                { type: "purchase", desc: "HDPE Pipe 2IN × 100m", amount: "+65,000", date: "2 days ago" },
              ].map(({ type, desc, amount, date }, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${type === "purchase" ? "bg-emerald-50" : "bg-red-50"}`}>
                    {type === "purchase" ? (
                      <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-500" />
                    ) : (
                      <ArrowUpLeft className="w-2.5 h-2.5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] text-neutral-700 truncate">{desc}</div>
                    <div className="text-[7px] text-neutral-400">{date}</div>
                  </div>
                  <div className={`text-[9px] font-bold ${type === "purchase" ? "text-emerald-500" : "text-red-500"}`}>{amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}