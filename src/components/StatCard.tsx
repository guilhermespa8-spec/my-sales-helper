import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

const variantMap = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export const StatCard = ({ title, value, icon: Icon, variant = "default", className }: StatCardProps) => {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-card-foreground mt-1">{value}</p>
        </div>
        <div className={cn("p-2.5 rounded-lg", variantMap[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
