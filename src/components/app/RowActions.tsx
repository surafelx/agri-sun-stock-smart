import { LucideIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

// One "⋯" button per row instead of a strip of icons; destructive actions sit last, after a line
const RowActions = ({ actions, label = "Row actions" }: { actions: RowAction[]; label?: string }) => {
  const shown = actions.filter((a) => !a.hidden);
  const safe = shown.filter((a) => !a.danger);
  const danger = shown.filter((a) => a.danger);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground print:hidden" aria-label={label} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {safe.map(({ label, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={label} onSelect={onSelect} className="gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}{label}
          </DropdownMenuItem>
        ))}
        {danger.length > 0 && safe.length > 0 && <DropdownMenuSeparator />}
        {danger.map(({ label, icon: Icon, onSelect }) => (
          <DropdownMenuItem key={label} onSelect={onSelect} className={cn("gap-2 text-red-600 focus:bg-red-50 focus:text-red-700")}>
            {Icon && <Icon className="h-4 w-4" />}{label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RowActions;
