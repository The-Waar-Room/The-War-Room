"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import StatCard from "@/components/dashboard/StatCard";
import {
  MessageSquare,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

const INR_RATE = 84;

interface UsageSummary {
  totalMessages: number;
  totalTokenInput: number;
  totalTokenOutput: number;
  totalCostUsd: number;
  totalCostInr: number;
  dailyBreakdown: Array<{ date: string; messages: number; cost: number }>;
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

export default function AiUsagePage() {
  const { data, isLoading, error } = useFirestore<UsageSummary>(
    "/api/admin/ai-usage?days=30",
    30000
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">AI Usage</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Last 30 days of AI consumption
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
          Failed to load AI usage data.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Messages"
              value={data.totalMessages.toLocaleString()}
              icon={MessageSquare}
              iconColor="text-violet-600"
            />
            <StatCard
              label="Total Cost"
              value={usd(data.totalCostUsd)}
              trend={inr(data.totalCostUsd * INR_RATE)}
              icon={DollarSign}
              iconColor="text-amber-600"
            />
            <StatCard
              label="Input Tokens"
              value={(data.totalTokenInput / 1000).toFixed(1) + "K"}
              icon={ArrowDownToLine}
              iconColor="text-blue-600"
            />
            <StatCard
              label="Output Tokens"
              value={(data.totalTokenOutput / 1000).toFixed(1) + "K"}
              icon={ArrowUpFromLine}
              iconColor="text-cyan-600"
            />
          </div>

          {data.dailyBreakdown.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Messages / Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 w-full">
                    <ResponsiveContainer>
                      <AreaChart data={data.dailyBreakdown}>
                        <defs>
                          <linearGradient
                            id="aiMsgGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="hsl(var(--primary))"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="100%"
                              stopColor="hsl(var(--primary))"
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
                          width={32}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 8,
                            border: "1px solid hsl(var(--border))",
                            fontSize: 12,
                            background: "hsl(var(--card))",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="messages"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#aiMsgGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cost / Day (USD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 w-full">
                    <ResponsiveContainer>
                      <AreaChart data={data.dailyBreakdown}>
                        <defs>
                          <linearGradient
                            id="aiCostGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#f59e0b"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="100%"
                              stopColor="#f59e0b"
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
                          formatter={(v) => [
                            `$${Number(v ?? 0).toFixed(4)}`,
                            "Cost",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="cost"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#aiCostGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {data.dailyBreakdown.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Cost (USD)</TableHead>
                    <TableHead>Cost (INR)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data.dailyBreakdown].reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="tabular-nums">{d.date}</TableCell>
                      <TableCell className="tabular-nums">
                        {d.messages.toLocaleString()}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
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
        </>
      )}
    </section>
  );
}
