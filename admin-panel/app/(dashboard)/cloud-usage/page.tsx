"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import StatCard from "@/components/dashboard/StatCard";
import {
  DollarSign,
  Cpu,
  Database,
  Cloud,
  Flame,
  Server,
  Users,
  Zap,
} from "lucide-react";

const INR_RATE = 84;

interface CloudUsageData {
  vertexAi: {
    totalCostUsd: number;
    totalMessages: number;
    totalTokenInput: number;
    totalTokenOutput: number;
  };
  firebase: {
    firestoreReads: number;
    firestoreWrites: number;
    authUsers: number;
    estimatedCostUsd: number;
  };
  cloudRun: {
    estimatedRequestCount: number;
    estimatedCostUsd: number;
  };
  totalCostUsd: number;
  totalCostInr: number;
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

export default function CloudUsagePage() {
  const { data, isLoading, error } = useFirestore<CloudUsageData>(
    "/api/admin/cloud-usage?days=30",
    60000
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Cloud Usage</h1>
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
        <>
          {/* Total cost cards */}
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

          {/* ── Service details ── */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Vertex AI card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-sm font-semibold">
                    Vertex AI
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Gemini 2.5 Flash
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span className="font-medium tabular-nums">
                    {data.vertexAi.totalMessages.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Input Tokens</span>
                  <span className="font-medium tabular-nums">
                    {formatNum(data.vertexAi.totalTokenInput)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Output Tokens</span>
                  <span className="font-medium tabular-nums">
                    {formatNum(data.vertexAi.totalTokenOutput)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Cost</span>
                  <span className="font-bold tabular-nums text-violet-600">
                    {usd(data.vertexAi.totalCostUsd)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Firebase card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-sm font-semibold">
                    Firebase
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Estimated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firestore Reads</span>
                  <span className="font-medium tabular-nums">
                    {formatNum(data.firebase.firestoreReads)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Firestore Writes
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatNum(data.firebase.firestoreWrites)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auth Users</span>
                  <span className="font-medium tabular-nums">
                    {data.firebase.authUsers.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Est. Cost</span>
                  <span className="font-bold tabular-nums text-orange-600">
                    {usd(data.firebase.estimatedCostUsd)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Run card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">
                    Cloud Run
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    Estimated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requests</span>
                  <span className="font-medium tabular-nums">
                    {formatNum(data.cloudRun.estimatedRequestCount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg/Day</span>
                  <span className="font-medium tabular-nums">
                    {data.dailyBreakdown.length > 0
                      ? formatNum(
                          Math.round(
                            data.cloudRun.estimatedRequestCount /
                              data.dailyBreakdown.length
                          )
                        )
                      : "0"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Est. Cost</span>
                  <span className="font-bold tabular-nums text-blue-600">
                    {usd(data.cloudRun.estimatedCostUsd)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Charts ── */}
          {data.dailyBreakdown.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Stacked area - cost breakdown */}
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
                          formatter={(v: number, name: string) => [
                            `$${v.toFixed(5)}`,
                            name,
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

              {/* Total cost trend */}
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
                          formatter={(v: number) => [
                            `$${v.toFixed(5)}`,
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

          {/* ── Daily breakdown table ── */}
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
        </>
      )}
    </section>
  );
}
