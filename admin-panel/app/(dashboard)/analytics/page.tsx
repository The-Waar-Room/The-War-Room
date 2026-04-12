"use client";

import {
  BarChart3,
  ArrowRight,
  Activity,
  Globe2,
  Clock3,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { useFirestore } from "@/hooks/useFirestore";
import { getAdminAppHref, getAdminAppLabel } from "@/lib/admin-apps";

interface IntegrationMetric {
  label: string;
  note: string;
  value: string | null;
}

interface AnalyticsOverviewResponse {
  appId: string;
  configured: boolean;
  source: string;
  message: string;
  summary: IntegrationMetric[];
  highlights: string[];
  health: {
    state: "ok" | "action-required";
    summary: string;
    checks: Array<{
      label: string;
      status: "ok" | "warning" | "error";
      detail: string;
    }>;
    detectedValues: Array<{
      label: string;
      value: string | null;
    }>;
  };
}

function healthTone(status: "ok" | "warning" | "error") {
  if (status === "ok") {
    return {
      icon: CheckCircle2,
      iconClassName: "text-emerald-600",
      pillClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    icon: CircleAlert,
    iconClassName: status === "error" ? "text-rose-600" : "text-amber-600",
    pillClassName:
      status === "error"
        ? "border-rose-200 bg-rose-50 text-rose-800"
        : "border-amber-200 bg-amber-50 text-amber-800",
  };
}

const guideCards = [
  {
    title: "Audience",
    icon: Activity,
    text: "Active users, retention, and realtime audience health across the selected app.",
  },
  {
    title: "Engagement",
    icon: Clock3,
    text: "Engagement time, engaged sessions, and the events that matter most.",
  },
  {
    title: "Distribution",
    icon: Globe2,
    text: "Countries, device models, and app versions where your product is gaining traction.",
  },
];

export default function AnalyticsPage() {
  const { selectedApp } = useSelectedApp();
  const selectedAppLabel = getAdminAppLabel(selectedApp);
  const { data, isLoading, error } = useFirestore<AnalyticsOverviewResponse>(
    `/api/admin/analytics?app=${selectedApp}`,
    60000
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#C9D7FF] bg-gradient-to-br from-[#EEF4FF] via-white to-[#F7FAFF] p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
              <BarChart3 className="h-4 w-4" />
            </div>
            <Badge variant="secondary">Analytics</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Product Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Bring the most important Firebase Analytics signals for{" "}
            {selectedAppLabel} into one page for growth, engagement, retention,
            and distribution.
          </p>
        </div>
        <Link href={getAdminAppHref("/", selectedApp)}>
          <Button variant="outline" className="gap-1.5">
            Back to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {guideCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardContent className="flex gap-3 p-5">
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{card.text}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load analytics setup.
        </div>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    Analytics Card Set
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recommended metrics for the custom admin panel.
                  </p>
                </div>
                <Badge variant={data.configured ? "success" : "outline"}>
                  {data.configured ? "Connected" : "Setup needed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {data.summary.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border bg-muted/30 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {metric.value ?? "Pending"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metric.note}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integration Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Source
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {data.source}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  What to show
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.highlights.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                {data.message}
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Integration Health
                  </p>
                  <Badge
                    variant={data.health.state === "ok" ? "success" : "outline"}
                  >
                    {data.health.state === "ok" ? "Healthy" : "Action needed"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {data.health.summary}
                </p>
                <div className="mt-3 space-y-2">
                  {data.health.checks.map((check) => {
                    const tone = healthTone(check.status);
                    const Icon = tone.icon;

                    return (
                      <div
                        key={check.label}
                        className="rounded-xl border bg-white p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Icon
                            className={`mt-0.5 h-4 w-4 ${tone.iconClassName}`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-slate-900">
                                {check.label}
                              </p>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone.pillClassName}`}
                              >
                                {check.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">
                              {check.detail}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.health.detectedValues.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-dashed bg-white p-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-700">
                        {item.value ?? "Not detected"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Best dashboard summary cards
                </p>
                <ul className="mt-2 space-y-2 text-xs text-slate-600">
                  <li>Active users over time</li>
                  <li>Active users in the last 30 minutes</li>
                  <li>Average engagement time per active user</li>
                  <li>Engaged sessions per active user</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
