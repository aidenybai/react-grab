"use client";

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "paid" | "unpaid" | "overdue" | "void";
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onView?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export function InvoiceTable({
  invoices,
  onView,
  onDownload,
}: InvoiceTableProps) {
  return (
    <div className="invoice-table">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Date</th>
            <th>Due Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const formatted = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: inv.currency,
            }).format(inv.amount / 100);
            return (
              <tr key={inv.id}>
                <td>{inv.number}</td>
                <td>{inv.date}</td>
                <td>{inv.dueDate}</td>
                <td>{formatted}</td>
                <td>
                  <span
                    className={`invoice-table__status invoice-table__status--${inv.status}`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => onView?.(inv.id)}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => onDownload?.(inv.id)}
                  >
                    Download
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
