"use client";

import type { ComponentProps, ReactElement } from "react";
import { cn } from "@/utils/cn";

interface TableProps extends ComponentProps<"table"> {
  className?: string;
}

export const Table = ({ className, ...props }: TableProps): ReactElement => (
  <div className="relative w-full overflow-x-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);

Table.displayName = "Table";

interface TableHeaderProps extends ComponentProps<"thead"> {
  className?: string;
}

export const TableHeader = ({
  className,
  ...props
}: TableHeaderProps): ReactElement => (
  <thead className={cn("[&_tr]:border-b [&_tr]:border-white/10", className)} {...props} />
);

TableHeader.displayName = "TableHeader";

interface TableBodyProps extends ComponentProps<"tbody"> {
  className?: string;
}

export const TableBody = ({ className, ...props }: TableBodyProps): ReactElement => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

TableBody.displayName = "TableBody";

interface TableRowProps extends ComponentProps<"tr"> {
  className?: string;
}

export const TableRow = ({ className, ...props }: TableRowProps): ReactElement => (
  <tr
    className={cn(
      "border-b border-white/10 transition-colors hover:bg-white/[0.04]",
      className,
    )}
    {...props}
  />
);

TableRow.displayName = "TableRow";

interface TableHeadProps extends ComponentProps<"th"> {
  className?: string;
}

export const TableHead = ({ className, ...props }: TableHeadProps): ReactElement => (
  <th
    className={cn(
      "h-10 px-2 text-left align-middle text-xs font-medium uppercase tracking-wide text-white/45",
      className,
    )}
    {...props}
  />
);

TableHead.displayName = "TableHead";

interface TableCellProps extends ComponentProps<"td"> {
  className?: string;
}

export const TableCell = ({ className, ...props }: TableCellProps): ReactElement => (
  <td className={cn("px-2 py-2 align-middle", className)} {...props} />
);

TableCell.displayName = "TableCell";

interface TableCaptionProps extends ComponentProps<"caption"> {
  className?: string;
}

export const TableCaption = ({
  className,
  ...props
}: TableCaptionProps): ReactElement => (
  <caption className={cn("mt-4 text-sm text-white/45", className)} {...props} />
);

TableCaption.displayName = "TableCaption";
