"use client";

import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppInfo } from "@/lib/firestore";
import {
  ADMIN_APPS,
  getAdminAppLabel,
  normalizeAdminAppId,
} from "@/lib/admin-apps";

interface AppWithStats extends AppInfo {
  userCount: number;
  activeSubscriptions: number;
  messagesToday: number;
  costTodayUsd: number;
}

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AppsPage() {
  const { data, isLoading, error } = useFirestore<{ apps: AppWithStats[] }>(
    "/api/admin/apps",
    30000
  );
  const allowedAppIds = new Set(ADMIN_APPS.map((app) => app.id));
  const apps =
    data?.apps?.filter((app) =>
      allowedAppIds.has(normalizeAdminAppId(app.id))
    ) ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Apps</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Active products shown in this admin panel
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load apps.
        </div>
      )}

      {data?.apps && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <Card key={app.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {getAdminAppLabel(app.id)}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {app.platform} · {app.app_id}
                    </p>
                  </div>
                  <Badge variant={app.is_active ? "success" : "destructive"}>
                    {app.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Users</p>
                    <p className="text-lg font-bold tabular-nums">
                      {app.userCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Subs</p>
                    <p className="text-lg font-bold tabular-nums">
                      {app.activeSubscriptions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Messages Today
                    </p>
                    <p className="text-lg font-bold tabular-nums">
                      {app.messagesToday.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cost Today</p>
                    <p className="text-lg font-bold tabular-nums">
                      ${app.costTodayUsd.toFixed(4)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground/50">
                  Created {ts(app.created_at?._seconds)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {apps.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No supported apps found. Add deScroll or SoulLens app documents in
            the
            <code className="mx-1 rounded bg-muted px-1 text-xs">apps</code>
            Firestore collection.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
