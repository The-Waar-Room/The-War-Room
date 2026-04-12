"use client";

import { useState } from "react";
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
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { AlertTriangle, History, RefreshCw, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubscriptionEventInfo {
  id: string;
  user_id: string;
  app_id: string;
  event_type: string;
  event_source?: string;
  plan_type?: string;
  product_id?: string;
  old_status?: string;
  new_status?: string;
  billing_debug_message?: string;
  occurred_at?: { _seconds: number };
  created_at?: { _seconds: number };
}

interface SubscriptionEventsResponse {
  events: SubscriptionEventInfo[];
  stats: {
    total: number;
    failures: number;
    pending: number;
    renewals: number;
  };
}

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function badgeVariant(
  eventType: string
): "success" | "warning" | "secondary" | "destructive" {
  if (["renewed", "verify_success"].includes(eventType)) return "success";
  if (
    ["purchase_pending", "webhook_received", "plan_transition"].includes(
      eventType
    )
  )
    return "warning";
  if (
    [
      "purchase_failed",
      "verify_failed",
      "refunded",
      "revoked",
      "reconciliation_mismatch",
    ].includes(eventType)
  ) {
    return "destructive";
  }
  return "secondary";
}

export default function SubscriptionEventsPage() {
  const { selectedApp } = useSelectedApp();
  const appParam = `?app=${selectedApp}`;
  const [limit, setLimit] = useState(100);
  const { data, isLoading, error, mutate } =
    useFirestore<SubscriptionEventsResponse>(
      `/api/admin/subscription-events${appParam}&limit=${limit}`,
      30000
    );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Subscription Events</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Purchase history, verification failures, renewals, expiries,
            refunds, and reconciliation updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit((current) => (current === 100 ? 200 : 100))}
          >
            {limit === 100 ? "Show 200" : "Show 100"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load subscription events.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Events"
              value={data.stats.total.toLocaleString()}
              icon={History}
            />
            <StatCard
              label="Failures"
              value={data.stats.failures.toLocaleString()}
              icon={AlertTriangle}
              iconColor="text-rose-600"
            />
            <StatCard
              label="Pending"
              value={data.stats.pending.toLocaleString()}
              icon={TimerReset}
              iconColor="text-amber-600"
            />
            <StatCard
              label="Renewals"
              value={data.stats.renewals.toLocaleString()}
              icon={RefreshCw}
              iconColor="text-emerald-600"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {ts(
                        event.occurred_at?._seconds ??
                          event.created_at?._seconds
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(event.event_type)}>
                        {event.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.app_id}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.user_id?.slice(0, 12) || "unknown"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {event.plan_type || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {event.old_status || "—"} → {event.new_status || "—"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {event.billing_debug_message || event.product_id || "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {data.events.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No subscription events found.
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
