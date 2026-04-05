"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  CreditCard,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import MessagesChart from "@/components/dashboard/MessagesChart";
import RevenueChart from "@/components/dashboard/RevenueChart";
import StatCard from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
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
    maximumFractionDigits: 4,
  }).format(value);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const { data, isLoading, error } = useFirestore<DashboardResponse>(
    "/api/admin/dashboard",
    60000
  );
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((v) => v + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.summary?.updatedAt) setSecondsAgo(0);
  }, [data?.summary?.updatedAt]);

  const fallbackCharts = useMemo(
    () => ({
      messagesByDay: Array.from({ length: 7 }).map((_, i) => ({
        date: `Day ${i + 1}`,
        value: 0,
      })),
      revenueByMonth: Array.from({ length: 6 }).map((_, i) => ({
        month: `M${i + 1}`,
        value: 0,
      })),
    }),
    []
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load dashboard data. Check your Firestore connection.
      </div>
    );
  }

  const s = data.summary;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live overview of all your apps
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <p className="text-xs text-muted-foreground">{secondsAgo}s ago</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={s.totalUsers.toLocaleString()}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          label="Active Subs"
          value={s.activeSubscriptions.toLocaleString()}
          icon={CreditCard}
          iconColor="text-emerald-600"
        />
        <StatCard
          label="AI Messages Today"
          value={s.messagesToday.toLocaleString()}
          icon={MessageSquare}
          iconColor="text-violet-600"
        />
        <StatCard
          label="AI Cost Today"
          value={usd(s.aiCostUsd)}
          trend={inr(s.aiCostInr)}
          icon={DollarSign}
          iconColor="text-amber-600"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Revenue This Month"
          value={inr(s.revenueMonthInr)}
          icon={TrendingUp}
          iconColor="text-green-600"
        />
        <StatCard
          label="Profit"
          value={inr(s.profitInr)}
          icon={Target}
          iconColor="text-cyan-600"
        />
        <StatCard
          label="Cost/Message"
          value={
            s.messagesToday > 0 ? usd(s.aiCostUsd / s.messagesToday) : "$0.00"
          }
          icon={Zap}
          iconColor="text-orange-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MessagesChart
          data={
            s.messagesByDay.length
              ? s.messagesByDay
              : fallbackCharts.messagesByDay
          }
        />
        <RevenueChart
          data={
            s.revenueByMonth.length
              ? s.revenueByMonth
              : fallbackCharts.revenueByMonth
          }
        />
      </div>
    </section>
  );
}
