"use client";
import { useState, useEffect } from "react";

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
}

export const useAnalytics = (dateRange: { start: Date; end: Date }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setData({
        pageViews: Math.floor(Math.random() * 50000) + 10000,
        uniqueVisitors: Math.floor(Math.random() * 20000) + 5000,
        bounceRate: Math.random() * 0.4 + 0.2,
        avgDuration: Math.floor(Math.random() * 300) + 60,
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dateRange.start, dateRange.end]);

  return { data, loading };
};
