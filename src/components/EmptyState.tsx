import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed bg-card/50", className)}>
      <div className="p-3 rounded-full bg-muted mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
    </div>
  );
};
