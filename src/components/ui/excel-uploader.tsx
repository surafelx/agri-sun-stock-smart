import React, { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { items as itemsApi, transactions as txApi, categories as categoriesApi, normalizeItem } from "@/lib/api";
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

export function ExcelUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

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
    const date = new Date(String(value));
    if (isNaN(date.getTime())) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const readFile = (f: File): Promise<XLSX.WorkBook> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try { resolve(XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: "array" })); }
        catch { reject(new Error("Failed to parse Excel file")); }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(f);
    });

  const processFile = async (f: File) => {
    setFile(f); setError(null); setResult(null); setProgress(0);
    try {
      const workbook = await readFile(f);
      const productPreviews: ProductPreview[] = [];

      for (const sheetName of workbook.SheetNames) {
        const lower = sheetName.toLowerCase();
        if (["inventory", "products", "items", "summary", "dashboard"].some((k) => lower.includes(k))) continue;

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        if (data.length < 2) continue;

        let sku = "", productName = sheetName, uom = "Pcs";
        for (let ri = 0; ri < Math.min(8, data.length); ri++) {
          const row = data[ri];
          if (!row || !Array.isArray(row)) continue;
          for (let ci = 0; ci < row.length; ci++) {
            const cell = String(row[ci] || "").toLowerCase();
            const next = row[ci + 1];
            if ((cell.includes("stock code") || cell === "sku") && !sku) sku = String(next || "").trim();
            if ((cell.includes("item name") || cell.includes("name:") || cell === "item") && productName === sheetName)
              productName = String(next || row[ci + 2] || sheetName).trim();
            if ((cell.includes("uom") || cell.includes("unit")) && uom === "Pcs")
              uom = String(next || "Pcs").trim();
          }
        }
        if (!sku) sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase();

        let headerRowIdx = -1, dateCol = -1, refCol = -1, inCol = -1, outCol = -1, costCol = -1, totalBalCostCol = -1;
        for (let ri = 0; ri < Math.min(15, data.length); ri++) {
          const row = data[ri];
          if (!row || !Array.isArray(row)) continue;
          for (let ci = 0; ci < row.length; ci++) {
            const cell = String(row[ci] || "").toLowerCase().trim();
            if (cell === "date" && dateCol === -1) { headerRowIdx = ri; dateCol = ci; }
            else if (["reference", "ref", "reference no", "ref."].includes(cell) && refCol === -1) refCol = ci;
            else if (["in", "in qty", "quantity in", "rec"].includes(cell) && inCol === -1) inCol = ci;
            else if (["out", "out qty", "quantity out", "use", "issue"].includes(cell) && outCol === -1) outCol = ci;
            else if (["unit cost", "cost", "price", "rate"].includes(cell) && costCol === -1) costCol = ci;
            else if (["total bal at cost", "total balance", "total at cost"].includes(cell) && totalBalCostCol === -1) totalBalCostCol = ci;
          }
          if (headerRowIdx >= 0 && dateCol >= 0) break;
        }
        if (headerRowIdx < 0) continue;

        const transactions: ProductPreview["transactions"] = [];
        let totalIn = 0, totalOut = 0, lastCost = 0;
        for (let ri = headerRowIdx + 1; ri < data.length; ri++) {
          const row = data[ri];
          if (!row || !Array.isArray(row)) continue;
          if (!row.some((c) => c !== undefined && c !== null && c !== "")) continue;
          const inQty = parseNumber(inCol >= 0 ? row[inCol] : null);
          const outQty = parseNumber(outCol >= 0 ? row[outCol] : null);
          const unitCost = parseNumber(costCol >= 0 ? row[costCol] : null);
          const totalBalanceCost = parseNumber(totalBalCostCol >= 0 ? row[totalBalCostCol] : null);
          if (inQty > 0 || outQty > 0 || unitCost > 0 || totalBalanceCost > 0) {
            transactions.push({ date: parseDate(dateCol >= 0 ? row[dateCol] : null), reference: String(refCol >= 0 ? row[refCol] : ""), in: inQty, out: outQty, balance: inQty - outQty, unitCost, totalBalanceCost });
            totalIn += inQty; totalOut += outQty;
            if (unitCost > 0) lastCost = unitCost;
          }
        }

        productPreviews.push({ sheetName, name: productName, sku, uom, transactionCount: transactions.length, totalIn, totalOut, currentBalance: totalIn - totalOut, lastCost, totalBalanceCost: transactions.at(-1)?.totalBalanceCost ?? 0, transactions });
      }

      setProducts(productPreviews);
      setProgress(50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) processFile(f);
    else setError("Please drop an Excel file (.xlsx or .xls)");
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const toggleExpand = (sheetName: string) => {
    const next = new Set(expandedProducts);
    next.has(sheetName) ? next.delete(sheetName) : next.add(sheetName);
    setExpandedProducts(next);
  };

  const detectCategory = (name: string): string => {
    const n = name.toLowerCase();
    const cats: Record<string, string[]> = {
      "Solar & Power Systems": ["solar", "panel", "pump", "inverter", "battery", "controller", "mppt", "charge"],
      "Pipes & Plumbing": ["pipe", "hose", "hdpe", "ppr", "pvc"],
      "Pipe Fittings & Valves": ["fitting", "socket", "adaptor", "tee", "elbow", "valve", "connecter"],
      "Structural Steel": ["rhs", "shs", "rebar", "steel", "channel", "flat bar", "sheet"],
      "Tools & Hardware": ["tool", "cutting", "cutter", "bit", "clamp"],
      "Electrical": ["cable", "wire", "breaker", "fuse", "gland"],
      "Well & Borehole": ["casing", "well", "borehole", "riser"],
    };
    for (const [cat, keywords] of Object.entries(cats))
      if (keywords.some((kw) => n.includes(kw))) return cat;
    return "General";
  };

  const startImport = async () => {
    if (!file || products.length === 0) return;
    setIsProcessing(true); setProgress(0); setResult(null); setError(null);

    try {
      // Fetch existing items from our API
      const itemsRes = await itemsApi.list({ limit: "1000" });
      const existingItems = (itemsRes.items || []).map(normalizeItem);
      const itemsMap = new Map<string, any>();
      existingItems.forEach((item: any) => itemsMap.set(item.name.trim().toLowerCase(), item));

      // Fetch or create a default category for imported items
      const catsRes = await categoriesApi.list();
      let defaultCatId: string | null = (catsRes.categories || [])[0]?._id || (catsRes.categories || [])[0]?.id || null;
      if (!defaultCatId) {
        const newCat = await categoriesApi.create("Imported");
        defaultCatId = newCat.category._id || newCat.category.id;
      }

      setProgress(20);

      let transactionsCount = 0;
      let matchedCount = 0;

      for (let pi = 0; pi < products.length; pi++) {
        const product = products[pi];
        const normalizedName = product.name.trim().toLowerCase();
        let item = itemsMap.get(normalizedName);

        // Create item if it doesn't exist
        if (!item) {
          try {
            const created = await itemsApi.create({
              name: product.name, sku: product.sku, category: defaultCatId,
              uom: product.uom || "Pcs", costPrice: product.lastCost,
            });
            item = normalizeItem(created.item);
            itemsMap.set(normalizedName, item);
          } catch {
            continue;
          }
        }
        matchedCount++;

        // Create transactions
        for (const tx of product.transactions) {
          if (tx.in === 0 && tx.out === 0) continue;
          if (tx.in > 0 && tx.unitCost === 0) continue;
          try {
            await txApi.create({
              transactionType: tx.in > 0 ? "purchase" : "sale",
              referenceNumber: tx.reference || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              transactionDate: tx.date,
              customerSupplierName: "Import",
              notes: `Imported: ${product.name}`,
              items: [{ item: item.id, quantity: tx.in > 0 ? tx.in : tx.out, unitPrice: tx.unitCost || product.lastCost || 1 }],
            });
            transactionsCount++;
          } catch { /* skip duplicates */ }
        }

        setProgress(20 + Math.round(((pi + 1) / products.length) * 75));
      }

      setProgress(100);
      setResult({ success: true, message: `Import completed!`, productsCount: matchedCount, transactionsCount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setResult({ success: false, message: "Import failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => { setFile(null); setProducts([]); setExpandedProducts(new Set()); setResult(null); setError(null); setProgress(0); };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Import Inventory from Excel</CardTitle>
        <CardDescription>Preview and import your stock items with transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}>
            <Upload className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Drag and drop your Excel file here</p>
            <p className="text-sm text-muted-foreground mb-4">Each sheet should represent a product with stock transactions</p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="file-upload" />
            <Button asChild><label htmlFor="file-upload" className="cursor-pointer">Browse Files</label></Button>
          </div>
        ) : result?.success ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{result.message}</h3>
            <p className="text-muted-foreground mb-4">Imported {result.productsCount} products and {result.transactionsCount} transactions</p>
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
              <Loader2 className="h-5 w-5 animate-spin" /><span>Importing your data...</span>
            </div>
          </div>
        ) : products.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div><p className="font-medium">{file.name}</p><p className="text-sm text-muted-foreground">{products.length} products found</p></div>
              <div className="flex gap-2"><Button variant="outline" onClick={reset}>Cancel</Button><Button onClick={startImport}>Import All</Button></div>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Stock Code</TableHead><TableHead>Product Name</TableHead><TableHead>UOM</TableHead>
                    <TableHead className="text-right">IN</TableHead><TableHead className="text-right">OUT</TableHead>
                    <TableHead className="text-right">Balance</TableHead><TableHead className="text-right">Last Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <React.Fragment key={product.sku}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(product.sheetName)}>
                        <TableCell>{expandedProducts.has(product.sheetName) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{detectCategory(product.name)}</p></TableCell>
                        <TableCell>{product.uom}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{product.totalIn.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{product.totalOut.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{product.currentBalance.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{product.lastCost > 0 ? product.lastCost.toLocaleString() : "-"}</TableCell>
                      </TableRow>
                      {expandedProducts.has(product.sheetName) && product.transactions.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="max-h-64 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted">
                                    <TableHead>Date</TableHead><TableHead>Reference</TableHead>
                                    <TableHead className="text-right">IN</TableHead><TableHead className="text-right">OUT</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {product.transactions.map((tx, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{tx.date}</TableCell>
                                      <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                                      <TableCell className="text-right text-green-600">{tx.in > 0 ? tx.in.toLocaleString() : ""}</TableCell>
                                      <TableCell className="text-right text-red-600">{tx.out > 0 ? tx.out.toLocaleString() : ""}</TableCell>
                                      <TableCell className="text-right">{tx.unitCost > 0 ? tx.unitCost.toLocaleString() : ""}</TableCell>
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
          <div className="text-center py-12"><p className="text-muted-foreground">No products found in the file</p></div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExcelUploader;
