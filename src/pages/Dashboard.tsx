import { useEffect, useState } from "react";
import { dashboard } from "@/lib/api";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
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
  }, []);

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
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome to your inventory management system</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">{stats?.totalItems ?? 0}</div>
              <p className="text-[10px] text-muted-foreground">Unique products in inventory</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">{(stats?.totalInventoryValue ?? 0).toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground">At cost price</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold text-destructive">{stats?.lowStockItems ?? 0}</div>
              <p className="text-[10px] text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">{(stats?.monthlyRevenue ?? 0).toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground">{stats?.monthlySaleCount ?? 0} sales this month</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaction Values</CardTitle>
              <CardDescription className="text-xs">Monthly purchase vs sales vs transfers</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="purchases" fill="hsl(var(--primary))" name="Purchases" />
                  <Bar dataKey="sales" fill="hsl(var(--chart-2))" name="Sales" />
                  <Bar dataKey="transfers" fill="hsl(var(--chart-3))" name="Transfers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaction Trends</CardTitle>
              <CardDescription className="text-xs">12-month transaction value trends</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="purchases" stroke="hsl(var(--primary))" name="Purchases" />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-2))" name="Sales" />
                  <Line type="monotone" dataKey="transfers" stroke="hsl(var(--chart-3))" name="Transfers" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
