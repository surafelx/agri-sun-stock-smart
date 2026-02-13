import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Items from "./pages/Items";
import StockCard from "./pages/StockCard";
import StockBalance from "./pages/StockBalance";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import Admin from "./pages/Admin";
import ImportPage from "./pages/ImportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/items" element={<Items />} />
          <Route path="/stock-card/:itemId" element={<StockCard />} />
          <Route path="/stock-balance" element={<StockBalance />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:transactionId" element={<TransactionDetail />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
