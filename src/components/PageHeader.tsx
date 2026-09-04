import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  code?: string;
  children?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, code, children, className }: PageHeaderProps) => {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          {code && <span className="rule-label text-primary">{code}</span>}
          <h1 className="stripe-title text-2xl sm:text-3xl leading-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>

        {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
};
