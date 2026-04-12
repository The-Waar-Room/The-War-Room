"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  MessageSquare,
  DollarSign,
  TrendingUp,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  Activity,
} from "lucide-react";
import MessagesChart from "@/components/dashboard/MessagesChart";
import RevenueChart from "@/components/dashboard/RevenueChart";
import StatCard from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore } from "@/hooks/useFirestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { getAdminAppHref, getAdminAppLabel } from "@/lib/admin-apps";
import type { DashboardSummary, TopUserByCost } from "@/lib/firestore";

interface DashboardResponse {
  summary: DashboardSummary;
  topUsers: TopUserByCost[];
}

interface SupportStatsResponse {
  stats: {
    total: number;
    open: number;
    waitingCustomer: number;
    waitingSupport: number;
    resolved: number;
    closed: number;
  };
}

interface IntegrationMetric {
  label: string;
  note: string;
  value: string | null;
}

interface IntegrationOverviewResponse {
  appId: string;
  configured: boolean;
  source: string;
  message: string;
  summary: IntegrationMetric[];
  highlights: string[];
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
  const { selectedApp } = useSelectedApp();
  const appParam = `?app=${selectedApp}`;
  const supportStatsParam = `?stats=true&app=${selectedApp}`;
  const selectedAppLabel = getAdminAppLabel(selectedApp);
  const { data, isLoading, error } = useFirestore<DashboardResponse>(
    `/api/admin/dashboard${appParam}`,
    60000
  );
  const { data: supportStatsData } = useFirestore<SupportStatsResponse>(
    `/api/admin/support-tickets${supportStatsParam}`,
    60000
  );
  const { data: analyticsData } = useFirestore<IntegrationOverviewResponse>(
    `/api/admin/analytics${appParam}`,
    60000
  );
  const { data: crashlyticsData } = useFirestore<IntegrationOverviewResponse>(
    `/api/admin/crashlytics${appParam}`,
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
  const openSupportCount = supportStatsData?.stats.open ?? 0;
  const waitingSupportCount = supportStatsData?.stats.waitingSupport ?? 0;
  const supportTrend = `${waitingSupportCount} waiting on owner`;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live overview of {selectedAppLabel}
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
          label="Active Users"
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
          label="Revenue This Month"
          value={inr(s.revenueMonthInr)}
          icon={TrendingUp}
          iconColor="text-emerald-600"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Open Support"
          value={openSupportCount.toLocaleString()}
          trend={supportTrend}
          icon={MessageSquare}
          iconColor="text-rose-600"
        />
        <StatCard
          label="AI Cost Today"
          value={usd(s.aiCostUsd)}
          trend={inr(s.aiCostInr)}
          icon={DollarSign}
          iconColor="text-amber-600"
        />
        <StatCard
          label="Attention Needed"
          value={waitingSupportCount.toLocaleString()}
          trend="Support tickets waiting on team"
          icon={Activity}
          iconColor="text-violet-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[#C9D7FF] bg-gradient-to-br from-[#EEF4FF] via-white to-[#F7F9FF]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Product Analytics
                </CardTitle>
                <p className="mt-1 text-xs text-slate-600">
                  User growth, engagement, versions, events, and retention.
                </p>
              </div>
              <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(analyticsData?.summary ?? []).slice(0, 4).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border bg-white/80 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {metric.value ?? "Pending"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{metric.note}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(analyticsData?.highlights ?? []).slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-800"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-sky-200 bg-white/80 p-3">
              <p className="text-xs text-slate-600">
                {analyticsData?.message ??
                  "Connect the GA4 Analytics Data API to populate live metrics in this section."}
              </p>
              <Link href={getAdminAppHref("/analytics", selectedApp)}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  Open Analytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FFD9C7] bg-gradient-to-br from-[#FFF4EE] via-white to-[#FFF9F5]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Crashlytics
                </CardTitle>
                <p className="mt-1 text-xs text-slate-600">
                  Stability signals, crash-free users, issue spikes, and version
                  health.
                </p>
              </div>
              <div className="rounded-2xl bg-orange-100 p-2 text-orange-700">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {(crashlyticsData?.summary ?? []).slice(0, 4).map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border bg-white/80 p-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {metric.value ?? "Pending"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{metric.note}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(crashlyticsData?.highlights ?? []).slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] text-orange-800"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-orange-200 bg-white/80 p-3">
              <p className="text-xs text-slate-600">
                {crashlyticsData?.message ??
                  "Connect Crashlytics issue summaries to surface real-time stability status here."}
              </p>
              <Link href={getAdminAppHref("/crashlytics", selectedApp)}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  Open Crashlytics
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
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

      <Card className="border-[#B2CCFF] bg-gradient-to-r from-[#EEF4FF] via-[#F8FAFF] to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[#0F172A]">
            Support Messages Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-[#475467]">
            Check Firestore support conversations, review pending customer
            issues, and reply directly as owner from one place.
          </p>
          <Link
            href={getAdminAppHref("/support-messages", selectedApp)}
            className="inline-flex"
          >
            <Button size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Open Support Messages
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Top Users by Cost */}
      {data.topUsers && data.topUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Top Users by AI Cost (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topUsers.map((user, i) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {user.email.length > 30
                          ? user.email.slice(0, 27) + "…"
                          : user.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {user.messageCount.toLocaleString()} messages
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-amber-600">
                    {usd(user.totalCostUsd)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
