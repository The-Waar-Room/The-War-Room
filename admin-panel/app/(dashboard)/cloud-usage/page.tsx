"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/dashboard/StatCard";
import {
  DollarSign,
  Cpu,
  Flame,
  Server,
  AlertTriangle,
  TrendingUp,
  Database,
  Shield,
  Users,
  Zap,
  Settings2,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

import { INR_RATE } from "@/lib/firestore";

interface CloudUsageData {
  vertexAi: {
    totalCostUsd: number;
    totalMessages: number;
    totalTokenInput: number;
    totalTokenOutput: number;
    inputCostUsd: number;
    outputCostUsd: number;
    avgTokensPerMessage: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      messages: number;
      tokenInput: number;
      tokenOutput: number;
    }>;
  };
  firebase: {
    firestoreReads: number;
    firestoreWrites: number;
    authUsers: number;
    readCostUsd: number;
    writeCostUsd: number;
    estimatedCostUsd: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      reads: number;
      writes: number;
    }>;
  };
  cloudRun: {
    estimatedRequestCount: number;
    estimatedCpuSeconds: number;
    estimatedMemoryGbSeconds: number;
    requestCostUsd: number;
    computeCostUsd: number;
    estimatedCostUsd: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      requests: number;
    }>;
  };
  budgets: {
    vertex_ai: number;
    cloud_run: number;
    firebase: number;
  };
  totalCostUsd: number;
  totalCostInr: number;
  daysInPeriod: number;
  dailyBreakdown: Array<{
    date: string;
    vertexAi: number;
    firebase: number;
    cloudRun: number;
    total: number;
  }>;
}

function usd(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(v);
}

function inr(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(v);
}

function formatNum(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return v.toLocaleString();
}

// ── Budget progress bar ──
function BudgetBar({
  spent,
  budget,
  label,
  color,
}: {
  spent: number;
  budget: number;
  label: string;
  color: string;
}) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = spent > budget && budget > 0;
  const isWarning = pct > 80 && !isOver;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {usd(spent)} / {usd(budget)}
          {isOver && (
            <span className="ml-1.5 text-destructive">
              ({usd(spent - budget)} over)
            </span>
          )}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            isOver ? "bg-destructive" : isWarning ? "bg-amber-500" : color
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{pct.toFixed(1)}% used</span>
        <span>{usd(Math.max(budget - spent, 0))} remaining</span>
      </div>
    </div>
  );
}

// ── Metric Row ──
function MetricRow({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums">{value}</span>
        {subtext && (
          <p className="text-[10px] text-muted-foreground">{subtext}</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ── OVERVIEW TAB ──
// ═══════════════════════════════════════════
function OverviewTab({ data }: { data: CloudUsageData }) {
  const totalBudget =
    data.budgets.vertex_ai + data.budgets.cloud_run + data.budgets.firebase;

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-semibold">
              Monthly Budget Overview
            </CardTitle>
            {data.totalCostUsd > totalBudget && totalBudget > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px]">
                <AlertTriangle className="mr-1 h-3 w-3" /> Over Budget
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <BudgetBar
            spent={data.totalCostUsd}
            budget={totalBudget}
            label="Total Spend"
            color="bg-primary"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <BudgetBar
              spent={data.vertexAi.totalCostUsd}
              budget={data.budgets.vertex_ai}
              label="Vertex AI"
              color="bg-violet-500"
            />
            <BudgetBar
              spent={data.cloudRun.estimatedCostUsd}
              budget={data.budgets.cloud_run}
              label="Cloud Run"
              color="bg-blue-500"
            />
            <BudgetBar
              spent={data.firebase.estimatedCostUsd}
              budget={data.budgets.firebase}
              label="Firebase"
              color="bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cloud Cost"
          value={usd(data.totalCostUsd)}
          trend={inr(data.totalCostInr)}
          icon={DollarSign}
          iconColor="text-amber-600"
        />
        <StatCard
          label="Vertex AI"
          value={usd(data.vertexAi.totalCostUsd)}
          trend={`${formatNum(data.vertexAi.totalMessages)} messages`}
          icon={Cpu}
          iconColor="text-violet-600"
        />
        <StatCard
          label="Firebase"
          value={usd(data.firebase.estimatedCostUsd)}
          trend={`${formatNum(data.firebase.firestoreReads)} reads`}
          icon={Flame}
          iconColor="text-orange-600"
        />
        <StatCard
          label="Cloud Run"
          value={usd(data.cloudRun.estimatedCostUsd)}
          trend={`${formatNum(data.cloudRun.estimatedRequestCount)} requests`}
          icon={Server}
          iconColor="text-blue-600"
        />
      </div>

      {/* Cost breakdown charts */}
      {data.dailyBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Cost Breakdown (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <AreaChart data={data.dailyBreakdown}>
                    <defs>
                      <linearGradient
                        id="vertexGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="firebaseGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#ea580c"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ea580c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="cloudRunGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown, name: unknown) => [
                        `$${Number(v).toFixed(5)}`,
                        String(name),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Area
                      type="monotone"
                      name="Vertex AI"
                      dataKey="vertexAi"
                      stackId="1"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      fill="url(#vertexGrad)"
                    />
                    <Area
                      type="monotone"
                      name="Firebase"
                      dataKey="firebase"
                      stackId="1"
                      stroke="#ea580c"
                      strokeWidth={1.5}
                      fill="url(#firebaseGrad)"
                    />
                    <Area
                      type="monotone"
                      name="Cloud Run"
                      dataKey="cloudRun"
                      stackId="1"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      fill="url(#cloudRunGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Cost / Day (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart data={data.dailyBreakdown}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown) => [
                        `$${Number(v).toFixed(5)}`,
                        "Total",
                      ]}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily breakdown table */}
      {data.dailyBreakdown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vertex AI</TableHead>
                <TableHead>Firebase</TableHead>
                <TableHead>Cloud Run</TableHead>
                <TableHead>Total (USD)</TableHead>
                <TableHead>Total (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...data.dailyBreakdown].reverse().map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="tabular-nums">{d.date}</TableCell>
                  <TableCell className="tabular-nums text-violet-600">
                    {usd(d.vertexAi)}
                  </TableCell>
                  <TableCell className="tabular-nums text-orange-600">
                    {usd(d.firebase)}
                  </TableCell>
                  <TableCell className="tabular-nums text-blue-600">
                    {usd(d.cloudRun)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {usd(d.total)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {inr(d.total * INR_RATE)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ── VERTEX AI TAB ──
// ═══════════════════════════════════════════
function VertexAiTab({ data }: { data: CloudUsageData }) {
  const v = data.vertexAi;
  return (
    <div className="space-y-6">
      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-600" />
            <CardTitle className="text-sm font-semibold">
              Vertex AI Budget
            </CardTitle>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Gemini 2.5 Flash
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetBar
            spent={v.totalCostUsd}
            budget={data.budgets.vertex_ai}
            label="Monthly Budget"
            color="bg-violet-500"
          />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cost"
          value={usd(v.totalCostUsd)}
          trend={inr(v.totalCostUsd * INR_RATE)}
          icon={DollarSign}
          iconColor="text-violet-600"
        />
        <StatCard
          label="Messages"
          value={formatNum(v.totalMessages)}
          trend={`${formatNum(v.avgTokensPerMessage)} avg tokens/msg`}
          icon={Zap}
          iconColor="text-violet-600"
        />
        <StatCard
          label="Input Tokens"
          value={formatNum(v.totalTokenInput)}
          trend={`Cost: ${usd(v.inputCostUsd)}`}
          icon={TrendingUp}
          iconColor="text-violet-600"
        />
        <StatCard
          label="Output Tokens"
          value={formatNum(v.totalTokenOutput)}
          trend={`Cost: ${usd(v.outputCostUsd)}`}
          icon={Cpu}
          iconColor="text-violet-600"
        />
      </div>

      {/* Pricing & Cost Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow
              label="Input Token Cost"
              value={usd(v.inputCostUsd)}
              subtext="$0.15 / 1M tokens"
            />
            <MetricRow
              label="Output Token Cost"
              value={usd(v.outputCostUsd)}
              subtext="$0.60 / 1M tokens"
            />
            <MetricRow
              label="Total Token Cost"
              value={usd(v.inputCostUsd + v.outputCostUsd)}
            />
            <MetricRow
              label="Avg Cost / Message"
              value={
                v.totalMessages > 0
                  ? usd(v.totalCostUsd / v.totalMessages)
                  : "$0"
              }
            />
            <MetricRow
              label="Avg Cost / Day"
              value={
                data.daysInPeriod > 0
                  ? usd(v.totalCostUsd / data.daysInPeriod)
                  : "$0"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Token Usage</CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow
              label="Total Input Tokens"
              value={formatNum(v.totalTokenInput)}
            />
            <MetricRow
              label="Total Output Tokens"
              value={formatNum(v.totalTokenOutput)}
            />
            <MetricRow
              label="Total Tokens"
              value={formatNum(v.totalTokenInput + v.totalTokenOutput)}
            />
            <MetricRow
              label="Avg Tokens / Message"
              value={formatNum(v.avgTokensPerMessage)}
            />
            <MetricRow
              label="Input / Output Ratio"
              value={
                v.totalTokenOutput > 0
                  ? (v.totalTokenInput / v.totalTokenOutput).toFixed(2) + "x"
                  : "N/A"
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Daily charts */}
      {v.dailyBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Cost (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <AreaChart data={v.dailyBreakdown}>
                    <defs>
                      <linearGradient id="vxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown) => [
                        `$${Number(v).toFixed(5)}`,
                        "Cost",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      fill="url(#vxGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Messages & Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <LineChart data={v.dailyBreakdown}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown, name: unknown) => [
                        formatNum(Number(v)),
                        String(name),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Line
                      type="monotone"
                      name="Messages"
                      dataKey="messages"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Input Tokens"
                      dataKey="tokenInput"
                      stroke="#a78bfa"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                    <Line
                      type="monotone"
                      name="Output Tokens"
                      dataKey="tokenOutput"
                      stroke="#c4b5fd"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily table */}
      {v.dailyBreakdown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Input Tokens</TableHead>
                <TableHead>Output Tokens</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Cost (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...v.dailyBreakdown].reverse().map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="tabular-nums">{d.date}</TableCell>
                  <TableCell className="tabular-nums">
                    {d.messages.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNum(d.tokenInput)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNum(d.tokenOutput)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-violet-600">
                    {usd(d.cost)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {inr(d.cost * INR_RATE)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ── CLOUD RUN TAB ──
// ═══════════════════════════════════════════
function CloudRunTab({ data }: { data: CloudUsageData }) {
  const cr = data.cloudRun;
  const avgRequestsPerDay =
    data.daysInPeriod > 0
      ? Math.round(cr.estimatedRequestCount / data.daysInPeriod)
      : 0;

  return (
    <div className="space-y-6">
      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-semibold">
              Cloud Run Budget
            </CardTitle>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              us-central1
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetBar
            spent={cr.estimatedCostUsd}
            budget={data.budgets.cloud_run}
            label="Monthly Budget"
            color="bg-blue-500"
          />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cost"
          value={usd(cr.estimatedCostUsd)}
          trend={inr(cr.estimatedCostUsd * INR_RATE)}
          icon={DollarSign}
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Requests"
          value={formatNum(cr.estimatedRequestCount)}
          trend={`${formatNum(avgRequestsPerDay)} avg/day`}
          icon={Zap}
          iconColor="text-blue-600"
        />
        <StatCard
          label="CPU Time"
          value={`${formatNum(Math.round(cr.estimatedCpuSeconds))}s`}
          trend={`Cost: ${usd(cr.computeCostUsd)}`}
          icon={Cpu}
          iconColor="text-blue-600"
        />
        <StatCard
          label="Memory (GB-s)"
          value={formatNum(Math.round(cr.estimatedMemoryGbSeconds))}
          trend="256 MB / instance"
          icon={Server}
          iconColor="text-blue-600"
        />
      </div>

      {/* Cost Breakdown & Service Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow
              label="Request Cost"
              value={usd(cr.requestCostUsd)}
              subtext="$0.40 / 1M requests"
            />
            <MetricRow
              label="CPU Cost"
              value={usd(cr.estimatedCpuSeconds * 0.000024)}
              subtext="$0.0240 / 1K vCPU-sec"
            />
            <MetricRow
              label="Memory Cost"
              value={usd(cr.estimatedMemoryGbSeconds * 0.0000025)}
              subtext="$0.0025 / 1K GB-sec"
            />
            <MetricRow label="Total Compute" value={usd(cr.computeCostUsd)} />
            <MetricRow
              label="Avg Cost / Request"
              value={
                cr.estimatedRequestCount > 0
                  ? usd(cr.estimatedCostUsd / cr.estimatedRequestCount)
                  : "$0"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Service Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow label="Service" value="the-war-room" />
            <MetricRow label="Region" value="us-central1" />
            <MetricRow
              label="Min Instances"
              value="0"
              subtext="Scale to zero"
            />
            <MetricRow label="Max Instances" value="10" />
            <MetricRow label="CPU" value="1 vCPU" />
            <MetricRow label="Memory" value="256 MB" />
            <MetricRow label="Timeout" value="300s" />
          </CardContent>
        </Card>
      </div>

      {/* Pricing Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Cloud Run Pricing (us-central1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Free Tier (monthly)</TableHead>
                  <TableHead>Price (after free tier)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">CPU</TableCell>
                  <TableCell>180,000 vCPU-seconds</TableCell>
                  <TableCell>$0.00002400 / vCPU-second</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Memory</TableCell>
                  <TableCell>360,000 GB-seconds</TableCell>
                  <TableCell>$0.00000250 / GB-second</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Requests</TableCell>
                  <TableCell>2,000,000 requests</TableCell>
                  <TableCell>$0.40 / million requests</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Networking</TableCell>
                  <TableCell>1 GB / month</TableCell>
                  <TableCell>$0.12 / GB (North America)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Daily chart */}
      {cr.dailyBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Cost (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <AreaChart data={cr.dailyBreakdown}>
                    <defs>
                      <linearGradient id="crGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => `$${v.toFixed(4)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown) => [
                        `$${Number(v).toFixed(6)}`,
                        "Cost",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      fill="url(#crGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart data={cr.dailyBreakdown}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown) => [
                        Number(v).toLocaleString(),
                        "Requests",
                      ]}
                    />
                    <Bar
                      dataKey="requests"
                      fill="#2563eb"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily table */}
      {cr.dailyBreakdown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Cost (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...cr.dailyBreakdown].reverse().map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="tabular-nums">{d.date}</TableCell>
                  <TableCell className="tabular-nums">
                    {d.requests.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-blue-600">
                    {usd(d.cost)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {inr(d.cost * INR_RATE)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ── FIREBASE TAB ──
// ═══════════════════════════════════════════
function FirebaseTab({ data }: { data: CloudUsageData }) {
  const fb = data.firebase;

  return (
    <div className="space-y-6">
      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-600" />
            <CardTitle className="text-sm font-semibold">
              Firebase Budget
            </CardTitle>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Blaze Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetBar
            spent={fb.estimatedCostUsd}
            budget={data.budgets.firebase}
            label="Monthly Budget"
            color="bg-orange-500"
          />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cost"
          value={usd(fb.estimatedCostUsd)}
          trend={inr(fb.estimatedCostUsd * INR_RATE)}
          icon={DollarSign}
          iconColor="text-orange-600"
        />
        <StatCard
          label="Firestore Reads"
          value={formatNum(fb.firestoreReads)}
          trend={`Cost: ${usd(fb.readCostUsd)}`}
          icon={Database}
          iconColor="text-orange-600"
        />
        <StatCard
          label="Firestore Writes"
          value={formatNum(fb.firestoreWrites)}
          trend={`Cost: ${usd(fb.writeCostUsd)}`}
          icon={Database}
          iconColor="text-orange-600"
        />
        <StatCard
          label="Auth Users"
          value={formatNum(fb.authUsers)}
          trend="Firebase Auth"
          icon={Users}
          iconColor="text-orange-600"
        />
      </div>

      {/* Cost Breakdown & Firestore Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow
              label="Firestore Read Cost"
              value={usd(fb.readCostUsd)}
              subtext="$0.06 / 100K reads"
            />
            <MetricRow
              label="Firestore Write Cost"
              value={usd(fb.writeCostUsd)}
              subtext="$0.18 / 100K writes"
            />
            <MetricRow
              label="Auth Cost"
              value="$0.00"
              subtext="Free up to 50K MAU"
            />
            <MetricRow
              label="Total Estimated"
              value={usd(fb.estimatedCostUsd)}
            />
            <MetricRow
              label="Avg Cost / Day"
              value={
                data.daysInPeriod > 0
                  ? usd(fb.estimatedCostUsd / data.daysInPeriod)
                  : "$0"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Firestore Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y text-sm">
            <MetricRow
              label="users"
              value="User profiles"
              subtext="Read per chat request"
            />
            <MetricRow
              label="apps"
              value="App configs"
              subtext="Read per chat request"
            />
            <MetricRow
              label="config"
              value="Global config"
              subtext="Cached, read on startup"
            />
            <MetricRow
              label="subscriptions"
              value="Plan data"
              subtext="Read for rate limiting"
            />
            <MetricRow
              label="ai_usage"
              value="Usage tracking"
              subtext="Write per chat message"
            />
          </CardContent>
        </Card>
      </div>

      {/* Pricing Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Firebase Pricing (Blaze Plan)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Free Tier (daily)</TableHead>
                  <TableHead>Price (after free tier)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Firestore Reads</TableCell>
                  <TableCell>50,000 / day</TableCell>
                  <TableCell>$0.06 / 100K reads</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Firestore Writes
                  </TableCell>
                  <TableCell>20,000 / day</TableCell>
                  <TableCell>$0.18 / 100K writes</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Firestore Deletes
                  </TableCell>
                  <TableCell>20,000 / day</TableCell>
                  <TableCell>$0.02 / 100K deletes</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Firestore Storage
                  </TableCell>
                  <TableCell>1 GB total</TableCell>
                  <TableCell>$0.18 / GB / month</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Authentication</TableCell>
                  <TableCell>50K MAU (phone: 10K)</TableCell>
                  <TableCell>$0.0055 / MAU (after free)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Cloud Storage</TableCell>
                  <TableCell>5 GB storage, 1 GB/day download</TableCell>
                  <TableCell>$0.026 / GB / month</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Daily charts */}
      {fb.dailyBreakdown.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Cost (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <AreaChart data={fb.dailyBreakdown}>
                    <defs>
                      <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#ea580c"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#ea580c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => `$${v.toFixed(4)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown) => [
                        `$${Number(v).toFixed(6)}`,
                        "Cost",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#ea580c"
                      strokeWidth={1.5}
                      fill="url(#fbGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Daily Reads & Writes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full">
                <ResponsiveContainer>
                  <BarChart data={fb.dailyBreakdown}>
                    <CartesianGrid
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={(v: number) => formatNum(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                        background: "hsl(var(--card))",
                      }}
                      formatter={(v: unknown, name: unknown) => [
                        formatNum(Number(v)),
                        String(name),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar
                      name="Reads"
                      dataKey="reads"
                      fill="#ea580c"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Writes"
                      dataKey="writes"
                      fill="#fb923c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily table */}
      {fb.dailyBreakdown.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reads</TableHead>
                <TableHead>Writes</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Cost (INR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...fb.dailyBreakdown].reverse().map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="tabular-nums">{d.date}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatNum(d.reads)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNum(d.writes)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-orange-600">
                    {usd(d.cost)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {inr(d.cost * INR_RATE)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ── BUDGET SETTINGS ──
// ═══════════════════════════════════════════
function BudgetSettings({
  budgets,
  onSaved,
}: {
  budgets: { vertex_ai: number; cloud_run: number; firebase: number };
  onSaved: () => void;
}) {
  const [vertexAi, setVertexAi] = useState(budgets.vertex_ai.toString());
  const [cloudRun, setCloudRun] = useState(budgets.cloud_run.toString());
  const [firebase, setFirebase] = useState(budgets.firebase.toString());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/budgets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertex_ai: parseFloat(vertexAi) || 0,
          cloud_run: parseFloat(cloudRun) || 0,
          firebase: parseFloat(firebase) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update budgets");
      toast({
        title: "Budgets updated",
        description: "Monthly budget limits have been saved.",
      });
      onSaved();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update budgets.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Monthly Budget Limits (USD)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <Cpu className="h-3 w-3 text-violet-600" /> Vertex AI
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={vertexAi}
                onChange={(e) => setVertexAi(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <Server className="h-3 w-3 text-blue-600" /> Cloud Run
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={cloudRun}
                onChange={(e) => setCloudRun(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <Flame className="h-3 w-3 text-orange-600" /> Firebase
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={firebase}
                onChange={(e) => setFirebase(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Total: $
            {(
              (parseFloat(vertexAi) || 0) +
              (parseFloat(cloudRun) || 0) +
              (parseFloat(firebase) || 0)
            ).toFixed(2)}{" "}
            / month
          </p>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3 w-3" />
            {saving ? "Saving…" : "Save Budgets"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════
// ── MAIN PAGE ──
// ═══════════════════════════════════════════
export default function CloudUsagePage() {
  const { data, isLoading, error, mutate } = useFirestore<CloudUsageData>(
    "/api/admin/cloud-usage?days=30",
    60000
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Cloud & Budget</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Google Cloud, Firebase &amp; Vertex AI costs · last 30 days
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load cloud usage data.
        </div>
      )}

      {data && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="overview">
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="vertex-ai">
              <Cpu className="mr-1.5 h-3.5 w-3.5" />
              Vertex AI
            </TabsTrigger>
            <TabsTrigger value="cloud-run">
              <Server className="mr-1.5 h-3.5 w-3.5" />
              Cloud Run
            </TabsTrigger>
            <TabsTrigger value="firebase">
              <Flame className="mr-1.5 h-3.5 w-3.5" />
              Firebase
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Budgets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab data={data} />
          </TabsContent>

          <TabsContent value="vertex-ai">
            <VertexAiTab data={data} />
          </TabsContent>

          <TabsContent value="cloud-run">
            <CloudRunTab data={data} />
          </TabsContent>

          <TabsContent value="firebase">
            <FirebaseTab data={data} />
          </TabsContent>

          <TabsContent value="settings">
            <BudgetSettings budgets={data.budgets} onSaved={() => mutate()} />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
