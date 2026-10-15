import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboard, items as itemsApi, transactions as txApi, normalizeItem, normalizeTransaction } from "@/lib/api";
import Layout from "@/components/Layout";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { TxTypeBadge, StockStatusBadge } from "@/components/app/Badges";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, AlertTriangle, Wallet, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatMoney, formatQty, formatCompact, formatDate, orDash } from "@/lib/format";
import { cn } from "@/lib/utils";

// Long figures switch to the compact form so a stat tile never overflows
// Glance figures: a million and up reads as 2.6M (the exact amount goes in the hint line)
const fitMoney = (n: number) => (Math.abs(n) >= 1_000_000 ? formatCompact(n) : formatMoney(n));
const exactHint = (n: number, rest: string) => (Math.abs(n) >= 1_000_000 ? `${formatMoney(n)} ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));

const SERIES = [
  { key: "purchases", name: "Purchases", color: "hsl(var(--chart-1))" },
  { key: "sales", name: "Sales", color: "hsl(var(--chart-2))" },
  { key: "transfers", name: "Transfers", color: "hsl(var(--chart-3))" },
];

const tick = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const tooltipProps = {
  formatter: (v: any) => formatMoney(v),
  contentStyle: { borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "none" },
  labelStyle: { fontWeight: 500, marginBottom: 2 },
};
const legendProps = { iconType: "circle" as const, iconSize: 8, wrapperStyle: { fontSize: 12, paddingTop: 8 } };

const CardHead = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);

// What an empty list area says: still loading, failed, or genuinely empty
const listMessage = (list: unknown[] | null | "error", empty: string, what: string) =>
  list === null ? "Loading…" : list === "error" ? `Couldn't load ${what}. Refresh to try again.` : empty;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  // null while loading, "error" if the request failed, so an empty list only ever means empty
  const [recent, setRecent] = useState<any[] | null | "error">(null);
  const [lowStock, setLowStock] = useState<any[] | null | "error">(null);
  const [chartView, setChartView] = useState<"bars" | "lines">("bars");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboard.stats(), dashboard.chartTransactions()])
      .then(([statsData, chartRes]) => {
        setStats(statsData);
        // Convert YYYY-MM to short month name for display
        setChartData(
          chartRes.chartData.map((d: any) => ({
            name: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            purchases: d.purchase || 0,
            sales: d.sale || 0,
            transfers: d.transfer || 0,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // The two lists load on their own, so one failing never blanks the page
    txApi.list({ limit: "6" })
      .then((res) => setRecent((res.transactions || []).slice(0, 6).map(normalizeTransaction)))
      .catch((err) => { console.error(err); setRecent("error"); });
    itemsApi.lowStock()
      .then((res) => setLowStock((res.items || []).map(normalizeItem)))
      .catch((err) => { console.error(err); setLowStock("error"); });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const lowCount = stats?.lowStockItems ?? 0;
  const saleCount = stats?.monthlySaleCount ?? 0;
  const axisProps = { tickLine: false, axisLine: false, tick };

  return (
    <Layout>
      <div className="space-y-5">
        <PageHeader title="Dashboard" description="Stock and activity at a glance" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Items" value={formatQty(stats?.totalItems ?? 0)} hint="Products in inventory" icon={Package} />
          <StatCard label="Inventory value" value={fitMoney(stats?.totalInventoryValue ?? 0)} hint={exactHint(stats?.totalInventoryValue ?? 0, "at cost price")} icon={Wallet} />
          <StatCard
            label="Low stock"
            value={formatQty(lowCount)}
            hint="items at or below their threshold"
            icon={AlertTriangle}
            tone={lowCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="This month's sales"
            value={fitMoney(stats?.monthlyRevenue ?? 0)}
            hint={`${saleCount} ${saleCount === 1 ? "sale" : "sales"}`}
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHead
              title="Transaction value"
              description="Monthly value by type"
              action={
                <div className="flex shrink-0 rounded-md border p-0.5 text-xs">
                  {(["bars", "lines"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setChartView(v)}
                      className={cn("rounded px-2 py-0.5 capitalize transition-colors", chartView === v ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      {v === "bars" ? "Bars" : "Trend"}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="px-2 pb-3 pt-4">
              <ResponsiveContainer width="100%" height={260}>
                {chartView === "bars" ? (
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={44} tickFormatter={(v) => formatCompact(v)} />
                    <Tooltip {...tooltipProps} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Legend {...legendProps} />
                    {SERIES.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} />)}
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} width={44} tickFormatter={(v) => formatCompact(v)} />
                    <Tooltip {...tooltipProps} />
                    <Legend {...legendProps} />
                    {SERIES.map((s) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />)}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHead
              title="Low stock"
              description={Array.isArray(lowStock) && lowStock.length ? `${lowStock.length} ${lowStock.length === 1 ? "item" : "items"} to reorder` : undefined}
              action={<button onClick={() => navigate("/stock-balance")} className="shrink-0 text-xs font-medium text-primary hover:underline">View all</button>}
            />
            {!Array.isArray(lowStock) || lowStock.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">{listMessage(lowStock, "Nothing is running low.", "low stock")}</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((item) => {
                      const qty = item.quantity ?? 0;
                      return (
                        <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(`/stock-card/${item.id}`)}>
                          <TableCell className="max-w-[160px]">
                            <div className="truncate font-medium">{item.name}</div>
                            <div className="truncate font-mono text-xs text-muted-foreground">{orDash(item.sku)}</div>
                          </TableCell>
                          <TableCell className="text-right">{formatQty(qty)}</TableCell>
                          <TableCell><StockStatusBadge quantity={qty} isLowStock /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHead
            title="Recent transactions"
            action={<button onClick={() => navigate("/transactions")} className="shrink-0 text-xs font-medium text-primary hover:underline">View all</button>}
          />
          {!Array.isArray(recent) || recent.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{listMessage(recent, "No transactions yet.", "recent transactions")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((tx) => (
                  <TableRow key={tx.id} className="cursor-pointer" onClick={() => navigate(`/transactions/${tx.id}`)}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell><TxTypeBadge type={tx.transaction_type} /></TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-xs">{orDash(tx.reference_number)}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{orDash(tx.customer_supplier_name)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(tx.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
