import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

const accentMap = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export const StatCard = ({ title, value, icon: Icon, variant = "default", className }: StatCardProps) => {
  return (
    <div className={cn("border border-border bg-card p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="rule-label">{title}</p>
        <Icon className={cn("w-4 h-4", accentMap[variant])} />
      </div>
      <p className={cn("font-display text-4xl mt-4 leading-none", accentMap[variant])}>{value}</p>
    </div>
  );
};
