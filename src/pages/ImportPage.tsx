import Layout from "@/components/Layout";
import PageHeader from "@/components/app/PageHeader";
import { ExcelUploader } from "@/components/ui/excel-uploader";
import { Card } from "@/components/ui/card";

const ImportPage = () => (
  <Layout>
    <div className="space-y-5">
      <PageHeader title="Import" description="Bring in stock cards from Excel" />

      <ExcelUploader />

      <Card className="bg-muted/30 shadow-none">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Expected Excel structure</h3>
          <p className="text-xs text-muted-foreground">Each sheet is one product: its details on top, then one row per movement.</p>
        </div>

        <div className="grid gap-5 p-4 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Example sheet</p>
            <pre className="overflow-x-auto rounded-md border bg-card p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`Stock Code :   18-01-02
Item Name:     S.St. Connecter  Z  50pcs
UOM :          Pcs

Date        Reference     IN  OUT  Bal.  Unit Cost  Total Bal at Cost
05/08/2024  FS-00005041   20        20   1,304.35   26,087.00
05/08/2024  CRV-4/17           1    19   1,304.35   24,782.65
05/08/2024  CRV-5/17           1    18   1,304.35   23,478.30`}
            </pre>
          </div>

          <div className="grid content-start gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Product details (rows 1–3)</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="text-foreground">Stock code</span> — product identifier</li>
                <li><span className="text-foreground">Item name</span> — product description</li>
                <li><span className="text-foreground">UOM</span> — unit of measure (Pcs, Kg…)</li>
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Movement columns</p>
              <ul className="space-y-1 text-muted-foreground">
                <li><span className="text-foreground">Date</span>, <span className="text-foreground">Reference</span></li>
                <li><span className="text-foreground">IN</span> — quantity received</li>
                <li><span className="text-foreground">OUT</span> — quantity issued</li>
                <li><span className="text-foreground">Unit cost</span> — cost per unit</li>
              </ul>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">How it's read</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                <li>IN rows become purchases, OUT rows become sales; rows with neither are skipped.</li>
                <li>Each row's unit cost feeds the weighted average cost.</li>
                <li>Balance columns are for reference only — balances are recalculated from the movements.</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </Layout>
);

export default ImportPage;
