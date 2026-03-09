"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

function StatRow({
  label,
  value,
  badge,
  testId,
}: {
  label: string;
  value: string;
  badge?: string;
  testId?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-2"
      data-testid={testId}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
    </div>
  );
}

export function ShadcnDataDisplay({
  "data-testid": testId,
}: {
  "data-testid"?: string;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Metrics</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="shadcn-tooltip-button"
              >
                ?
              </Button>
            </TooltipTrigger>
            <TooltipContent>Last 30 days of performance data</TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" data-testid="shadcn-skeleton" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div>
            <StatRow
              label="Response Time"
              value="142ms"
              badge="-12%"
              testId="shadcn-stat-row"
            />
            <Separator />
            <StatRow label="Uptime" value="99.97%" badge="SLA" />
            <Separator />
            <StatRow label="Error Rate" value="0.03%" />
            <Separator />
            <StatRow label="Throughput" value="1.2K rps" badge="+8%" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
