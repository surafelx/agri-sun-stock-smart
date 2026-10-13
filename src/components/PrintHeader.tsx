import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Letterhead shown only on paper: the screen header is hidden when printing
export const PrintHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="hidden print:block mb-4 border-b pb-2">
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-lg font-bold">Agrisun Ethiopia</h1>
        <p className="text-base font-semibold">{title}</p>
        {subtitle && <p className="text-xs">{subtitle}</p>}
      </div>
      <p className="text-xs">Printed {new Date().toLocaleString()}</p>
    </div>
  </div>
);

export const PrintButton = ({ label = "Print" }: { label?: string }) => (
  <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
    <Printer className="mr-1.5 h-4 w-4" />{label}
  </Button>
);
