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
    <div
      className={cn(
        "grid-surface border border-border bg-card/60 flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      <div className="border border-border bg-background p-3 mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="stripe-title text-lg">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      )}
    </div>
  );
};
