import Layout from "@/components/Layout";
import { ExcelUploader } from "@/components/ui/excel-uploader";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ImportPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/items")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Items
          </Button>
        </div>

        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            Import Inventory from Excel
          </h2>
          <p className="text-muted-foreground">
            Upload an Excel file with your product stock cards. Each sheet represents a product with its transaction history.
          </p>
        </div>

        <ExcelUploader />

        <div className="max-w-2xl mx-auto mt-8">
          <h3 className="font-semibold mb-4">Expected Excel Structure</h3>
          
          <div className="border rounded-lg p-4 mb-4 bg-muted/30">
            <h4 className="font-medium mb-2">Each Sheet Represents One Product</h4>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
Stock Code :      18-01-02
Item Name:     S.St. Connecter  Z  50pcs
UOM :          Pcs

Date          Reference     IN    OUT   Bal.   Unit Cost   Total Bal at Cost
05/08/2024    FS-00005041   20          20    1,304.35    26,087.00
05/08/2024    CRV-4/17           1    19    1,304.35    24,782.65
05/08/2024    CRV-5/17           1    18    1,304.35    23,478.30
            </pre>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">Product Info (Rows 1-3)</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Stock Code: Product identifier</li>
                <li>• Item Name: Product description</li>
                <li>• UOM: Unit of measure (Pcs, Kg, etc.)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Transaction Columns</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Date: Transaction date</li>
                <li>• Reference: Document number</li>
                <li>• IN: Quantity received (positive)</li>
                <li>• OUT: Quantity issued (negative)</li>
                <li>• Unit Cost: Cost per unit</li>
              </ul>
            </div>
          </div>

          <div className="border rounded-lg p-4 mt-4">
            <h4 className="font-medium mb-2">How It Works</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Each sheet is treated as a separate product</li>
              <li>The IN column adds stock (purchases)</li>
              <li>The OUT column reduces stock (sales)</li>
              <li>Unit Cost is used to calculate weighted average</li>
              <li>Running balance columns are for reference only</li>
              <li>Actual balance is calculated from transactions</li>
            </ol>
          </div>

          <div className="border rounded-lg p-4 mt-4 bg-amber/10 border-amber/20">
            <h4 className="font-medium text-amber-800 mb-2">Important Notes</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Only rows with IN or OUT values will be imported as transactions</li>
              <li>• The running balance shown in Excel is just for reference</li>
              <li>• The system will calculate the actual balance from all transactions</li>
              <li>• Unit cost is taken from each row for weighted average calculation</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImportPage;
