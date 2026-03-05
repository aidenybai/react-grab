"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// BUG: Revenue is in cents, not dollars — shows "128999" instead of "$1,289.99"
// BUG: Users change shows wrong sign — should be "+8.2%" but shows "-8.2%"
// BUG: Orders value is weirdly precise — "384.00000" instead of "384"
const METRICS = [
  { label: "Revenue", value: "128999", change: "+12.5%" },
  { label: "Users", value: "2,847", change: "-8.2%" },
  { label: "Orders", value: "384.00000", change: "-2.1%" },
];

const ACTIVITY_DATA = [
  { label: "New signup", time: "2m ago", status: "completed" },
  { label: "Order placed", time: "5m ago", status: "pending" },
  { label: "Payment received", time: "12m ago", status: "completed" },
  // BUG: "Refund processed" shows as "completed" instead of destructive/error
  { label: "Refund processed", time: "24m ago", status: "completed" },
  { label: "User upgraded plan", time: "1h ago", status: "completed" },
];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "default",
  pending: "secondary",
  completed: "outline",
  destructive: "destructive",
};

function MetricCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        {/* BUG: Raw value displayed with no formatting */}
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {change} from last month
        </p>
      </CardContent>
    </Card>
  );
}

function ActivityRow({
  label,
  time,
  status,
}: {
  label: string;
  time: string;
  status: string;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-right">{time}</TableCell>
    </TableRow>
  );
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Last 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="users">Users</SelectItem>
            </SelectContent>
          </Select>
          {/* BUG: Export button uses ghost variant — nearly invisible in dark mode */}
          <Button size="sm" variant="ghost" className="" onClick={() => { throw new Error("exportDashboard is not a function"); }}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {METRICS.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latset events from your dashbaord</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ACTIVITY_DATA.map((activity) => (
                <ActivityRow key={activity.label} {...activity} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
