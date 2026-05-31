import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number; // percentage, positive or negative
  trendLabel?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  invertTrend?: boolean; // for metrics where down is good (e.g. overdue)
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-amber-500 bg-amber-500/10",
  destructive: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = "primary",
  invertTrend,
}: KpiCardProps) {
  const positive = trend !== undefined && (invertTrend ? trend < 0 : trend > 0);
  const TrendIcon = trend !== undefined && trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            accentMap[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
              positive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-muted-foreground">{trendLabel}</span>
          )}
        </div>
      )}
      <div
        className={cn(
          "absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl",
          accentMap[accent].split(" ")[0].replace("text-", "bg-")
        )}
      />
    </Card>
  );
}
