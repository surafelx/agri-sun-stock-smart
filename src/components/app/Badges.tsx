import { ArrowRightLeft, ShoppingCart, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Stock status from quantity and low-stock threshold: in stock, low (amber), out (red)
export const stockStatus = (quantity: number, isLowStock?: boolean) =>
  quantity <= 0 ? { label: "Out of stock", variant: "danger" as const }
  : isLowStock ? { label: "Low stock", variant: "warning" as const }
  : { label: "In stock", variant: "success" as const };

export const StockStatusBadge = ({ quantity, isLowStock }: { quantity: number; isLowStock?: boolean }) => {
  const s = stockStatus(quantity, isLowStock);
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

// Each transaction type gets its own colour and icon, so a list can be scanned by type
const TX_TYPES = {
  purchase: { label: "Purchase", variant: "info" as const, Icon: ShoppingCart },
  sale: { label: "Sale", variant: "success" as const, Icon: TrendingUp },
  transfer: { label: "Transfer", variant: "violet" as const, Icon: ArrowRightLeft },
  adjustment: { label: "Adjustment", variant: "neutral" as const, Icon: SlidersHorizontal },
};

export const txTypeMeta = (type: string) => TX_TYPES[type as keyof typeof TX_TYPES] ?? { label: type, variant: "neutral" as const, Icon: SlidersHorizontal };

export const TxTypeBadge = ({ type }: { type: string }) => {
  const { label, variant, Icon } = txTypeMeta(type);
  return <Badge variant={variant}><Icon className="h-3 w-3" />{label}</Badge>;
};

const ROLES: Record<string, { label: string; variant: "violet" | "info" | "neutral" }> = {
  admin: { label: "Admin", variant: "violet" },
  accountant: { label: "Accountant", variant: "info" },
  inventory_clerk: { label: "Inventory clerk", variant: "neutral" },
};

export const RoleBadge = ({ role }: { role: string }) => {
  const r = ROLES[role] ?? { label: role, variant: "neutral" as const };
  return <Badge variant={r.variant}>{r.label}</Badge>;
};
