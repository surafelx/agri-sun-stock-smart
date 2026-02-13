import React, { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface ProductPreview {
  sheetName: string;
  name: string;
  sku: string;
  uom: string;
  transactionCount: number;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  lastCost: number;
  totalBalanceCost: number;
  transactions: Array<{
    date: string;
    reference: string;
    in: number;
    out: number;
    balance: number;
    unitCost: number;
    totalBalanceCost: number;
  }>;
}

interface ImportResult {
  success: boolean;
  message: string;
  productsCount?: number;
  transactionsCount?: number;
}

type TransactionType = "purchase" | "sale" | "adjustment";

interface TxInsert {
  transaction_type: TransactionType;
  reference_number: string;
  transaction_date: string;
  created_by: string;
  notes: string;
}

interface TxItemInsert {
  transaction_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function ExcelUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set()); // Empty - all collapsed by default
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const parseNumber = (value: unknown): number => {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === "number") return Number(value);
    if (typeof value === "string") {
      const cleaned = value.replace(/[,\s$£€]/g, "").trim();
      if (cleaned === "") return 0;
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const parseDate = (value: unknown): string => {
    if (!value) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    const dateStr = String(value);
    // Try to parse common formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const processFile = async (file: File) => {
    setFile(file);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const workbook = await readFile(file);
      const sheetNames = workbook.SheetNames;
      
      const productSheetNames = sheetNames.filter((s) => {
        const lower = s.toLowerCase();
        return !lower.includes("inventory") && 
               !lower.includes("products") && 
               !lower.includes("items") &&
               !lower.includes("summary") &&
               !lower.includes("dashboard");
      });

      const productPreviews: ProductPreview[] = [];

      for (const sheetName of productSheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        
        if (data.length < 2) continue;

        let sku = "";
        let productName = sheetName;
        let uom = "Pcs";

        for (let rowIdx = 0; rowIdx < Math.min(8, data.length); rowIdx++) {
          const row = data[rowIdx];
          if (!row || !Array.isArray(row)) continue;
          
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = String(row[colIdx] || "").toLowerCase();
            const nextCell = row[colIdx + 1];
            if (cell.includes("stock code") || cell.includes("code") || cell === "sku") {
              sku = String(nextCell || "").trim();
            }
            if (cell.includes("item name") || cell.includes("name:") || cell === "item") {
              productName = String(nextCell || row[colIdx + 2] || sheetName).trim();
            }
            if (cell.includes("uom") || cell.includes("unit")) {
              uom = String(nextCell || "Pcs").trim();
            }
          }
        }

        if (!sku) {
          sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
        }

        let headerRowIdx = -1;
        let dateCol = -1, refCol = -1, inCol = -1, outCol = -1, costCol = -1, balCol = -1, totalBalCostCol = -1;

        for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
          const row = data[rowIdx];
          if (!row || !Array.isArray(row)) continue;
          
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = String(row[colIdx] || "").toLowerCase().trim();
            if (cell === "date" && dateCol === -1) { headerRowIdx = rowIdx; dateCol = colIdx; }
            else if ((cell === "reference" || cell === "ref" || cell === "reference no" || cell === "ref.") && refCol === -1) { refCol = colIdx; }
            else if ((cell === "in" || cell === "in qty" || cell === "quantity in" || cell === "rec") && inCol === -1) { inCol = colIdx; }
            else if ((cell === "out" || cell === "out qty" || cell === "quantity out" || cell === "use" || cell === "issue") && outCol === -1) { outCol = colIdx; }
            else if ((cell === "unit cost" || cell === "cost" || cell === "price" || cell === "rate") && costCol === -1) { costCol = colIdx; }
            else if ((cell === "bal" || cell === "balance" || cell === "bal." || cell === "stock") && balCol === -1) { balCol = colIdx; }
            else if ((cell === "total bal at cost" || cell === "total balance" || cell === "total at cost") && totalBalCostCol === -1) { totalBalCostCol = colIdx; }
          }
          if (headerRowIdx >= 0 && dateCol >= 0) break;
        }

        if (headerRowIdx < 0) continue;

        const transactions: ProductPreview["transactions"] = [];
        let totalIn = 0, totalOut = 0, lastCost = 0;

        for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
          const row = data[rowIdx];
          if (!row || !Array.isArray(row)) continue;

          // Skip completely empty rows
          const rowHasData = row.some((cell) => cell !== undefined && cell !== null && cell !== "");
          if (!rowHasData) continue;

          const dateVal = dateCol >= 0 ? row[dateCol] : null;
          const refVal = refCol >= 0 ? row[refCol] : null;
          const inVal = inCol >= 0 ? row[inCol] : null;
          const outVal = outCol >= 0 ? row[outCol] : null;
          const costVal = costCol >= 0 ? row[costCol] : null;
          const totalBalCostVal = totalBalCostCol >= 0 ? row[totalBalCostCol] : null;

          // Skip if date is empty
          if (!dateVal && row.length > 0) {
            const firstCell = row[0];
            if (firstCell) {
              const parsedDate = parseDate(firstCell);
              if (parsedDate !== new Date().toISOString().split("T")[0]) {
                continue; // This looks like a data row, skip if no date
              }
            }
          }

          const inQty = parseNumber(inVal);
          const outQty = parseNumber(outVal);
          const unitCost = parseNumber(costVal);
          const totalBalanceCost = parseNumber(totalBalCostVal);
          const balance = inQty - outQty;

          // Add transaction if it has meaningful data
          if (inQty > 0 || outQty > 0 || unitCost > 0 || balance !== 0 || totalBalanceCost > 0) {
            transactions.push({
              date: parseDate(dateVal),
              reference: String(refVal || ""),
              in: inQty,
              out: outQty,
              balance: balance,
              unitCost: unitCost,
              totalBalanceCost: totalBalanceCost,
            });
            totalIn += inQty;
            totalOut += outQty;
            if (unitCost > 0) lastCost = unitCost;
          }
        }

        const lastTxTotalBalCost = transactions.length > 0 ? transactions[transactions.length - 1].totalBalanceCost : 0;

        productPreviews.push({
          sheetName,
          name: productName,
          sku,
          uom,
          transactionCount: transactions.length,
          totalIn,
          totalOut,
          currentBalance: totalIn - totalOut,
          lastCost,
          totalBalanceCost: lastTxTotalBalCost,
          transactions,
        });
      }

      setProducts(productPreviews);
      setProgress(50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      processFile(droppedFile);
    } else {
      setError("Please drop an Excel file (.xlsx or .xls)");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const readFile = (file: File): Promise<XLSX.WorkBook> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          resolve(workbook);
        } catch {
          reject(new Error("Failed to parse Excel file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const toggleExpand = (sheetName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(sheetName)) {
      newExpanded.delete(sheetName);
    } else {
      newExpanded.add(sheetName);
    }
    setExpandedProducts(newExpanded);
  };

  const detectCategory = (productName: string): string => {
    const name = productName.toLowerCase();
    const categories: Record<string, string[]> = {
      "Solar & Power Systems": ["solar", "panel", "pump", "inverter", "battery", "controller", "mppt", "charge"],
      "Pipes & Plumbing Materials": ["pipe", "hose", "hdpe", "ppr", "gi pipe", "pvc"],
      "Pipe Fittings & Valves": ["fitting", "socket", "adaptor", "tee", "elbow", "ball valve", "flange", "valve", "connecter"],
      "Structural Steel & Metal": ["rhs", "shs", "rebar", "steel", "channel", "flat bar", "sheet", "metal"],
      "Tools & Hardware": ["tool", "cutting", "cutter", "bit", "clamp", "fastener"],
      "Electrical Materials": ["cable", "wire", "breaker", "fuse", "gland"],
      "Construction & Civil Materials": ["cement", "gabion", "filter", "silicone"],
      "Well & Borehole Materials": ["casing", "well", "borehole", "riser"],
      "Safety & PPE": ["jacket", "helmet", "safety", "ppe"],
      "Enclosures & Control": ["control box", "enclosure", "box"],
    };
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some((kw) => name.includes(kw))) return cat;
    }
    return "General";
  };

  const startImport = async () => {
    if (!file || products.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "00000000-0000-0000-0000-000000000000";

      // Step 1: Fetch ALL existing items to match by SKU
      console.log("Fetching existing items...");
      const { data: existingItems, error: itemsError } = await supabase
        .from("items")
        .select("id, sku, name, uom, category_id, cost_price");

      if (itemsError) {
        console.error("Error fetching items:", itemsError);
        throw new Error(`Failed to fetch items: ${itemsError.message}`);
      }

      console.log(`Found ${existingItems?.length || 0} existing items in database`);

      // Create a map of item name -> item data (match by name, case-insensitive)
      const itemsMap = new Map<string, typeof existingItems[0]>();
      existingItems?.forEach((item) => {
        const normalizedName = item.name.trim().toLowerCase();
        itemsMap.set(normalizedName, item);
      });

      console.log("Items map names:", Array.from(itemsMap.keys()));

      // Log which products from Excel will be matched
      const skippedProducts: string[] = [];
      const matchedProducts: string[] = [];
      products.forEach((p) => {
        const normalizedName = p.name.trim().toLowerCase();
        const match = itemsMap.get(normalizedName);
        if (match) {
          console.log(`✓ "${p.name}" matched to item ID: ${match.id}`);
          matchedProducts.push(p.name);
        } else {
          console.log(`✗ "${p.name}" not found in database`);
          skippedProducts.push(p.name);
        }
      });

      setProgress(20);

      // Step 2: Check for existing transactions to avoid duplicates
      console.log("Checking for existing transactions...");
      const { data: existingTxs } = await supabase
        .from("transactions")
        .select("reference_number, transaction_date");
      
      const existingTxSet = new Set<string>();
      existingTxs?.forEach((tx) => {
        existingTxSet.add(`${tx.transaction_date}-${tx.reference_number}`);
      });
      console.log(`Found ${existingTxSet.size} existing transactions`);

      setProgress(30);

      // Step 3: Build transactions to insert with item_name tracking
      const newTransactions: Array<{
        transaction_type: TransactionType;
        reference_number: string;
        transaction_date: string;
        created_by: string;
        notes: string;
        item_name: string;
        quantity: number;
        unit_price: number;
      }> = [];

      for (const product of products) {
        const normalizedName = product.name.trim().toLowerCase();
        const item = itemsMap.get(normalizedName);
        if (!item) continue;

        for (const tx of product.transactions) {
          if (tx.in === 0 && tx.out === 0) continue;
          
          const txKey = `${parseDate(tx.date)}-${tx.reference || ""}`;
          
          if (existingTxSet.has(txKey)) {
            console.log(`Skipping duplicate transaction: ${txKey}`);
            continue;
          }
          
          const quantity = tx.in > 0 ? tx.in : tx.out;
          const unitPrice = Number(tx.unitCost) || 0;
          
          // Skip purchases without unit price (would cause division by zero in trigger)
          if (tx.in > 0 && unitPrice === 0) {
            console.log(`Skipping purchase with 0 unit_price for ${product.name}`);
            continue;
          }
          
          // Skip sales with 0 quantity
          if (tx.out > 0 && quantity === 0) {
            console.log(`Skipping sale with 0 quantity for ${product.name}`);
            continue;
          }
          
          newTransactions.push({
            transaction_type: (tx.in > 0 ? "purchase" : "sale") as TransactionType,
            reference_number: tx.reference || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            transaction_date: parseDate(tx.date),
            created_by: userId,
            notes: `Imported: ${product.name}`,
            item_name: product.name,
            quantity: quantity,
            unit_price: unitPrice,
          });
        }
      }

      console.log(`\nSummary:`);
      console.log(`- Products matched: ${matchedProducts.length}`);
      console.log(`- Products not found: ${skippedProducts.length}`);
      console.log(`- New transactions to insert: ${newTransactions.length}`);

      setProgress(40);

      // Step 4: Insert transactions
      const txData: Array<{
        id: string;
        reference_number: string;
        transaction_date: string;
        item_name: string;
        quantity: number;
        unit_price: number;
      }> = [];

      if (newTransactions.length > 0) {
        // Prepare data for insert (without the extra fields)
        const txsToInsert = newTransactions.map(({ item_name, quantity, unit_price, ...tx }) => tx);

        console.log(`Inserting ${txsToInsert.length} transactions...`);
        
        const { data, error: txError } = await supabase
          .from("transactions")
          .insert(txsToInsert as any)
          .select("id, reference_number, transaction_date");

        if (txError) {
          console.error("Transaction insert error:", txError);
          throw new Error(`Transaction insert failed: ${txError.message}`);
        }

        if (data && data.length > 0) {
          console.log(`Inserted ${data.length} transactions`);
          
          // Map back to include item details using index matching
          data.forEach((tx, idx) => {
            const originalTx = newTransactions[idx];
            if (originalTx) {
              txData.push({
                ...tx,
                item_name: originalTx.item_name,
                quantity: originalTx.quantity,
                unit_price: originalTx.unit_price,
              });
            }
          });
        }
      }

      setProgress(70);

      // Step 5: Insert transaction items with unit_price
      const txItemsToInsert: TxItemInsert[] = [];

      if (txData.length > 0) {
        console.log(`\nBuilding ${txData.length} transaction items...`);
        
        for (const tx of txData) {
          const normalizedName = tx.item_name.trim().toLowerCase();
          const item = itemsMap.get(normalizedName);
          
          if (!item) {
            console.log(`Warning: Item "${tx.item_name}" not found for transaction ${tx.id}`);
            continue;
          }

          const totalPrice = Number((tx.quantity * tx.unit_price).toFixed(2));

          const txItem: TxItemInsert = {
            transaction_id: tx.id,
            item_id: item.id,
            quantity: tx.quantity,
            unit_price: tx.unit_price,
            total_price: totalPrice,
          };

          console.log(`  TX ${tx.id}: "${tx.item_name}" -> Item ${item.id}, Qty: ${tx.quantity}, Unit: ${tx.unit_price}, Total: ${totalPrice}`);
          txItemsToInsert.push(txItem);
        }

        console.log(`Inserting ${txItemsToInsert.length} transaction items...`);
        
        if (txItemsToInsert.length > 0) {
          // Log what we're about to insert for debugging
          console.log("Transaction items to insert:", JSON.stringify(txItemsToInsert.map(t => ({
            transaction_id: t.transaction_id,
            item_id: t.item_id,
            quantity: t.quantity,
            unit_price: t.unit_price,
            total_price: t.total_price
          })), null, 2));
          
          // Disable the trigger temporarily to avoid division by zero
          try {
            await supabase.rpc('disable_trigger', { trigger_name: 'update_cost_price_on_purchase_trigger' });
          } catch (e) {
            console.log("Could not disable trigger, continuing anyway:", e);
          }
          
          const { error: tiError } = await supabase
            .from("transaction_items")
            .insert(txItemsToInsert);

          // Re-enable the trigger
          try {
            await supabase.rpc('enable_trigger', { trigger_name: 'update_cost_price_on_purchase_trigger' });
          } catch (e) {
            console.log("Could not re-enable trigger, continuing anyway:", e);
          }

          if (tiError) {
            console.error("Transaction items insert error:", tiError);
            throw new Error(`Transaction items insert failed: ${tiError.message}`);
          }
          
          console.log("Transaction items inserted successfully!");
        }
      } else {
        console.log("No transactions to create items for");
      }

      setProgress(100);

      const message = `Import completed! ${txData.length} transactions with ${txItemsToInsert.length} items imported.`;
      console.log(message);

      setResult({
        success: true,
        message,
        productsCount: matchedProducts.length,
        transactionsCount: txData.length,
      });
    } catch (err) {
      console.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Import failed");
      setResult({ success: false, message: "Import failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setProducts([]);
    setExpandedProducts(new Set());
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Inventory from Excel
        </CardTitle>
        <CardDescription>
          Preview and import your stock items with transaction history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drag and drop your Excel file here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Each sheet should represent a product with stock transactions
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">Browse Files</label>
            </Button>
          </div>
        ) : result?.success ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{result.message}</h3>
            <p className="text-muted-foreground mb-4">
              Imported {result.productsCount} products and {result.transactionsCount} transactions
            </p>
            <Button onClick={reset}>Import Another File</Button>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Import Failed</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={reset}>Try Again</Button>
          </div>
        ) : isProcessing ? (
          <div className="py-12">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Processing...</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="mb-4" />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Importing your data...</span>
            </div>
          </div>
        ) : products.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{products.length} products found</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={startImport}>Import All</Button>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Stock Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">IN</TableHead>
                    <TableHead className="text-right">OUT</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Last Cost</TableHead>
                    <TableHead className="text-right">Total Balance at Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <React.Fragment key={product.sku}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(product.sheetName)}>
                        <TableCell>
                          {expandedProducts.has(product.sheetName) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{detectCategory(product.name)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{product.uom}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{product.totalIn.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{product.totalOut.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{product.currentBalance.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{product.lastCost > 0 ? `${product.lastCost.toLocaleString()}` : "-"}</TableCell>
                        <TableCell className="text-right font-medium">{product.totalBalanceCost > 0 ? `${product.totalBalanceCost.toLocaleString()}` : "-"}</TableCell>
                      </TableRow>
                      {expandedProducts.has(product.sheetName) && product.transactions.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="max-h-64 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted">
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">IN</TableHead>
                                    <TableHead className="text-right">OUT</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Total Balance at Cost</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {product.transactions.map((tx, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{tx.date}</TableCell>
                                      <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                                      <TableCell className="text-right text-green-600">{tx.in > 0 ? tx.in.toLocaleString() : ""}</TableCell>
                                      <TableCell className="text-right text-red-600">{tx.out > 0 ? tx.out.toLocaleString() : ""}</TableCell>
                                      <TableCell className="text-right font-medium">{tx.balance.toLocaleString()}</TableCell>
                                      <TableCell className="text-right">{tx.unitCost > 0 ? `${tx.unitCost.toLocaleString()}` : ""}</TableCell>
                                      <TableCell className="text-right font-medium">{tx.totalBalanceCost > 0 ? `${tx.totalBalanceCost.toLocaleString()}` : ""}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found in the file</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExcelUploader;
