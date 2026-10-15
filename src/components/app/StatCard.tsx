import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  success: "text-emerald-700",
  warning: "text-amber-600",
  danger: "text-red-600",
};

// A figure with its label: label and icon on top, the value in the figures font, a quiet hint below
const StatCard = ({ label, value, hint, icon: Icon, tone = "default", className }: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) => (
  <div className={cn("min-w-0 rounded-lg border bg-card px-4 py-3.5 shadow-[var(--shadow-card)]", className)}>
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-[13px] font-medium text-muted-foreground">{label}</span>
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
    </div>
    {typeof value === "string" || typeof value === "number"
      ? <div className={cn("mt-1 truncate font-mono text-[22px] font-semibold leading-tight tracking-tight tabular-nums", TONES[tone])}>{value}</div>
      // Anything else (e.g. a status badge) sits in the value slot at its own size
      : <div className="mt-1.5 flex min-h-[27px] items-center">{value}</div>}
    {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
  </div>
);

export default StatCard;
