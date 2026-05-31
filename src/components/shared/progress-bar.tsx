import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  className,
  indicatorClassName,
  showValue = true,
}: {
  value: number;
  label?: string;
  className?: string;
  indicatorClassName?: string;
  showValue?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-semibold tabular-nums">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <Progress value={value} indicatorClassName={indicatorClassName} />
    </div>
  );
}
