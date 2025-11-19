import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  recentTransactions: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockCount: 0,
    recentTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*');

      if (itemsError) throw itemsError;

      // Calculate current stock and stats for each item
      let totalValue = 0;
      let totalCost = 0;
      let lowStockCount = 0;

      for (const item of items || []) {
        // Get current stock
        const { data: currentStock, error: stockError } = await supabase
          .rpc('get_current_stock', { item_id_param: item.id });

        if (stockError) {
          console.error('Error getting stock for item', item.id, stockError);
          continue;
        }

        // Get last transaction's unit_price for valuation
        const { data: lastTransaction, error: transError } = await supabase
          .from('transaction_items')
          .select('unit_price')
          .eq('item_id', item.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!transError && lastTransaction) {
          totalValue += currentStock * lastTransaction.unit_price;
        }

        totalCost += currentStock * item.cost_price;

        if (currentStock === 0) {
          lowStockCount++;
        } else if (currentStock <= item.low_stock_threshold) {
          lowStockCount++;
        }
      }

      // Fetch recent transactions
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) throw transError;

      setStats({
        totalItems: items?.length || 0,
        totalValue,
        lowStockCount,
        recentTransactions: transactions?.length || 0,
      });

      // Fetch real transaction data for charts
      const { data: allTransactions, error: allTransError } = await supabase
        .from('transactions')
        .select('transaction_type, total_amount, transaction_date')
        .order('transaction_date', { ascending: false })
        .limit(100); // Get last 100 transactions for chart data

      if (allTransError) throw allTransError;

      // Process transaction data for charts
      const monthlyData: { [key: string]: { purchases: number; sales: number } } = {};

      allTransactions?.forEach(transaction => {
        const date = new Date(transaction.transaction_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { purchases: 0, sales: 0 };
        }

        if (transaction.transaction_type === 'purchase') {
          monthlyData[monthKey].purchases += Number(transaction.total_amount);
        } else if (transaction.transaction_type === 'sale') {
          monthlyData[monthKey].sales += Number(transaction.total_amount);
        }
      });

      // Convert to chart format and sort by date
      const chartDataArray = Object.entries(monthlyData)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => {
          const dateA = new Date(a.name);
          const dateB = new Date(b.name);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(-6); // Show last 6 months

      setChartData(chartDataArray.length > 0 ? chartDataArray : [
        { name: 'No Data', purchases: 0, sales: 0 }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
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
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome to your inventory management system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">{stats.totalItems}</div>
              <p className="text-[10px] text-muted-foreground">Unique products in inventory</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">ETB {stats.totalValue.toLocaleString()}</div>
              <p className="text-[10px] text-muted-foreground">Current market value</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold text-destructive">{stats.lowStockCount}</div>
              <p className="text-[10px] text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-glow transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-xl font-bold">{stats.recentTransactions}</div>
              <p className="text-[10px] text-muted-foreground">Last 10 transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaction Values</CardTitle>
              <CardDescription className="text-xs">Monthly purchase vs sales amounts (ETB)</CardDescription>
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
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Transaction Trends</CardTitle>
              <CardDescription className="text-xs">6-month transaction value trends</CardDescription>
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
