import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive" | "accent";
  className?: string;
}

const accentMap = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  accent: "text-accent",
};

export const StatCard = ({
  title,
  value,
  hint,
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) => {
  return (
    <div className={cn("relative bg-card border border-border p-5 overflow-hidden", className)}>
      <span className="absolute left-0 top-0 h-full w-1 bg-primary" aria-hidden />
      <div className="flex items-start justify-between gap-3 pl-2">
        <p className="rule-label">{title}</p>
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <p className={cn("pl-2 font-display text-3xl mt-3 leading-none tabular-nums", accentMap[variant])}>
        {value}
      </p>
      {hint && <p className="pl-2 text-xs text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
};
