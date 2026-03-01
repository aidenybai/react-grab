"use client";

import type {
  HTMLAttributes,
  ReactElement,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/utils/cn";

export const Table = ({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>): ReactElement => {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
};

export const TableHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement => {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
};

export const TableBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement => {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
};

export const TableFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement => {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
};

export const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>): ReactElement => {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
};

export const TableHead = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>): ReactElement => {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
};

export const TableCell = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>): ReactElement => {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap", className)}
      {...props}
    />
  );
};

export const TableCaption = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>): ReactElement => {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};

Table.displayName = "Table";
TableHeader.displayName = "TableHeader";
TableBody.displayName = "TableBody";
TableFooter.displayName = "TableFooter";
TableRow.displayName = "TableRow";
TableHead.displayName = "TableHead";
TableCell.displayName = "TableCell";
TableCaption.displayName = "TableCaption";
