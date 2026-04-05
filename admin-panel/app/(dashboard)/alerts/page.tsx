"use client";

import { useFirestore } from "@/hooks/useFirestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertItem, AlertSeverity } from "@/lib/firestore";

const severityConfig: Record<
  AlertSeverity,
  {
    icon: typeof AlertTriangle;
    badge: "destructive" | "warning" | "secondary";
    ring: string;
    bg: string;
  }
> = {
  critical: {
    icon: ShieldAlert,
    badge: "destructive",
    ring: "border-red-200 dark:border-red-900",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  warning: {
    icon: AlertTriangle,
    badge: "warning",
    ring: "border-amber-200 dark:border-amber-900",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  info: {
    icon: Info,
    badge: "secondary",
    ring: "border-blue-200 dark:border-blue-900",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
};

export default function AlertsPage() {
  const { selectedApp } = useSelectedApp();
  const appParam = selectedApp !== "all" ? `?app=${selectedApp}` : "";
  const { data, isLoading, error, mutate } = useFirestore<{
    alerts: AlertItem[];
  }>(`/api/admin/alerts${appParam}`, 60000);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Alerts</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Live threshold-based alerts from your data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load alerts.
        </div>
      )}

      {data && data.alerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="text-center">
              <p className="font-medium">All Clear</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No alerts at the moment. Everything looks healthy.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && data.alerts.length > 0 && (
        <div className="space-y-3">
          {data.alerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <Card key={alert.id} className={`border ${cfg.ring} ${cfg.bg}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <Badge variant={cfg.badge} className="text-[10px]">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
