import type { ReactNode } from "react";

interface DataTableCardProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export const DataTableCard = ({
  title,
  description,
  actions,
  children,
}: DataTableCardProps) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground/80">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
};

DataTableCard.displayName = "DataTableCard";
