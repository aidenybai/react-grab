"use client";

import React from "react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

const stats: StatCard[] = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    trend: "up",
  },
  { title: "Subscriptions", value: "+2,350", change: "+180.1%", trend: "up" },
  { title: "Sales", value: "+12,234", change: "+19%", trend: "up" },
  { title: "Active Now", value: "+573", change: "+201", trend: "up" },
];

const recentActivity = [
  {
    id: "1",
    user: "Alice Johnson",
    action: "Created a new project",
    time: "2 minutes ago",
  },
  {
    id: "2",
    user: "Bob Smith",
    action: "Updated billing settings",
    time: "15 minutes ago",
  },
  {
    id: "3",
    user: "Carol White",
    action: "Deployed to production",
    time: "1 hour ago",
  },
  {
    id: "4",
    user: "Dave Brown",
    action: "Added team member",
    time: "2 hours ago",
  },
  {
    id: "5",
    user: "Eve Davis",
    action: "Generated monthly report",
    time: "3 hours ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-lg border bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-500">{stat.title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <span
                className={`text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <div className="mt-4 space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span>{" "}
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <div className="mt-4 flex h-48 items-center justify-center rounded-md bg-gray-50 text-sm text-gray-400">
            Chart placeholder
          </div>
        </div>
      </div>
    </div>
  );
}
