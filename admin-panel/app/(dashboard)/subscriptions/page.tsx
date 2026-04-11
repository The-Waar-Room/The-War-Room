"use client";

import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatCard from "@/components/dashboard/StatCard";
import type { SubscriptionInfo } from "@/lib/firestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { CheckCircle, ListTodo, BarChart3 } from "lucide-react";

interface SubsResponse {
  subscriptions: SubscriptionInfo[];
  stats: {
    active: number;
    total: number;
    planDistribution: Record<string, number>;
  };
}

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SubscriptionsPage() {
  const { selectedApp } = useSelectedApp();
  const appParam = `?app=${selectedApp}`;
  const { data, isLoading, error } = useFirestore<SubsResponse>(
    `/api/admin/subscriptions${appParam}`,
    30000
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Subscriptions</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Active plans and subscription history
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load subscriptions.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Active"
              value={data.stats.active.toLocaleString()}
              icon={CheckCircle}
              iconColor="text-emerald-600"
            />
            <StatCard
              label="Total All Time"
              value={data.stats.total.toLocaleString()}
              icon={ListTodo}
            />
            <StatCard
              label="Plans"
              value={Object.keys(data.stats.planDistribution).length.toString()}
              trend={Object.entries(data.stats.planDistribution)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
              icon={BarChart3}
              iconColor="text-violet-600"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.user_id.slice(0, 12)}…
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.app_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sub.plan_type}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.product_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === "active"
                            ? "success"
                            : sub.status === "expired"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {ts(sub.verified_at?._seconds)}
                    </TableCell>
                  </TableRow>
                ))}
                {data.subscriptions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No subscriptions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
