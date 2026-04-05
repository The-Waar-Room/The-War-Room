"use client";

import { useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/useToast";
import type { GlobalConfig } from "@/lib/firestore";

interface SettingsResponse {
  config: GlobalConfig | null;
  admins: Array<{ email: string; role: string }>;
}

export default function SettingsPage() {
  const { data, isLoading, error, mutate } = useFirestore<SettingsResponse>(
    "/api/admin/settings"
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function toggleKillSwitch() {
    if (!data?.config || saving) return;
    setSaving("kill_switch");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "kill_switch",
          enabled: !data.config.kill_switch,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      await mutate();
      toast({
        title: data.config.kill_switch
          ? "Kill switch disabled"
          : "Kill switch enabled",
        description: data.config.kill_switch
          ? "AI features are now active."
          : "AI features are disabled for all users.",
        variant: data.config.kill_switch ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Failed to update",
        description: "Could not toggle kill switch. Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function savePlanLimits(
    plan: string,
    limits: {
      daily_messages: number;
      max_input_tokens: number;
      max_output_tokens: number;
    }
  ) {
    setSaving(plan);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_plan", plan, limits }),
      });
      if (!res.ok) throw new Error("Failed");
      await mutate();
      toast({
        title: "Plan updated",
        description: `${plan} limits saved successfully.`,
      });
    } catch {
      toast({
        title: "Failed to save",
        description: `Could not update ${plan} limits. Try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load settings.
      </div>
    );
  }

  const config = data?.config;
  const admins = data?.admins || [];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Settings</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Global configuration and access control
        </p>
      </div>

      {/* Kill Switch */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Kill Switch</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Instantly disable AI features across all apps
              </p>
            </div>
            <Switch
              checked={config?.kill_switch ?? false}
              onCheckedChange={toggleKillSwitch}
              disabled={saving === "kill_switch"}
            />
          </div>
          {config?.kill_switch && (
            <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Kill switch is ON — AI features are disabled for all users.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Limits */}
      {config?.plans && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Plan Limits</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure daily message and context limits per plan
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(config.plans).map(([plan, limits]) => (
              <PlanLimitRow
                key={`${plan}-${limits.daily_messages}-${limits.max_input_tokens}-${limits.max_output_tokens}`}
                plan={plan}
                dailyMessages={limits.daily_messages}
                maxInputTokens={limits.max_input_tokens}
                maxOutputTokens={limits.max_output_tokens}
                saving={saving === plan}
                onSave={(updated) => savePlanLimits(plan, updated)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Admins */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Team Access</CardTitle>
          <p className="text-xs text-muted-foreground">
            Admins are managed in the{" "}
            <code className="rounded bg-muted px-1 text-[10px]">admins</code>{" "}
            Firestore collection
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.email}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
            >
              <span className="text-sm">{a.email}</span>
              <Badge
                variant={
                  a.role === "owner"
                    ? "warning"
                    : a.role === "admin"
                      ? "default"
                      : "secondary"
                }
              >
                {a.role}
              </Badge>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No admins configured.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function PlanLimitRow({
  plan,
  dailyMessages,
  maxInputTokens,
  maxOutputTokens,
  saving,
  onSave,
}: {
  plan: string;
  dailyMessages: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  saving: boolean;
  onSave: (limits: {
    daily_messages: number;
    max_input_tokens: number;
    max_output_tokens: number;
  }) => void;
}) {
  const [msgs, setMsgs] = useState(dailyMessages);
  const [inTok, setInTok] = useState(maxInputTokens);
  const [outTok, setOutTok] = useState(maxOutputTokens);
  const dirty =
    msgs !== dailyMessages ||
    inTok !== maxInputTokens ||
    outTok !== maxOutputTokens;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-muted/50 px-3 py-3">
      <div className="min-w-[80px]">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Plan
        </p>
        <p className="text-sm font-semibold capitalize">{plan}</p>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Daily Msgs
        </label>
        <Input
          type="number"
          value={msgs}
          onChange={(e) => setMsgs(Number(e.target.value))}
          className="mt-0.5 h-8 w-24 tabular-nums"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Max Input Tokens
        </label>
        <Input
          type="number"
          value={inTok}
          onChange={(e) => setInTok(Number(e.target.value))}
          className="mt-0.5 h-8 w-28 tabular-nums"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Max Output Tokens
        </label>
        <Input
          type="number"
          value={outTok}
          onChange={(e) => setOutTok(Number(e.target.value))}
          className="mt-0.5 h-8 w-28 tabular-nums"
        />
      </div>
      {dirty && (
        <Button
          size="sm"
          onClick={() =>
            onSave({
              daily_messages: msgs,
              max_input_tokens: inTok,
              max_output_tokens: outTok,
            })
          }
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      )}
    </div>
  );
}
