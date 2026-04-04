"use client";

import { useEffect, useMemo, useState } from "react";
import MessagesChart from "@/components/dashboard/MessagesChart";
import RevenueChart from "@/components/dashboard/RevenueChart";
import StatCard from "@/components/dashboard/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useFirestore } from "@/hooks/useFirestore";
import type { DashboardSummary } from "@/lib/firestore";

interface DashboardResponse {
  summary: DashboardSummary;
}

function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DashboardClient() {
  const { data, isLoading, error } = useFirestore<DashboardResponse>(
    "/api/admin/dashboard",
    60000
  );
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.summary?.updatedAt) {
      setSecondsAgo(0);
    }
  }, [data?.summary?.updatedAt]);

  const fallbackCharts = useMemo(
    () => ({
      messagesByDay: Array.from({ length: 7 }).map((_, i) => ({
        date: `D${i + 1}`,
        value: 0,
      })),
      revenueByMonth: Array.from({ length: 6 }).map((_, i) => ({
        month: `M${i + 1}`,
        value: 0,
      })),
    }),
    []
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load dashboard data.
      </div>
    );
  }

  const summary = data.summary;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-2xl">Dashboard</h1>
        <p className="text-xs text-slate-500">Last updated {secondsAgo}s ago</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Users" value={String(summary.totalUsers)} />
        <StatCard
          label="Active Subscriptions"
          value={String(summary.activeSubscriptions)}
        />
        <StatCard
          label="AI Messages Today"
          value={String(summary.messagesToday)}
        />
        <StatCard label="AI Cost Today (USD)" value={usd(summary.aiCostUsd)} />
        <StatCard label="AI Cost Today (INR)" value={inr(summary.aiCostInr)} />
        <StatCard
          label="Revenue This Month (INR)"
          value={inr(summary.revenueMonthInr)}
        />
        <StatCard label="Profit (INR)" value={inr(summary.profitInr)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MessagesChart
          data={
            summary.messagesByDay.length
              ? summary.messagesByDay
              : fallbackCharts.messagesByDay
          }
        />
        <RevenueChart
          data={
            summary.revenueByMonth.length
              ? summary.revenueByMonth
              : fallbackCharts.revenueByMonth
          }
        />
      </div>
    </section>
  );
}
