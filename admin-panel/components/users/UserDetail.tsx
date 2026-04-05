"use client";

import { useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/useToast";
import type {
  UserInfo,
  SubscriptionInfo,
  AiUsageRecord,
} from "@/lib/firestore";
import UserMessages from "@/components/users/UserMessages";
import Link from "next/link";
import { ArrowLeft, Ban, ShieldCheck } from "lucide-react";

interface UserDetailProps {
  uid: string;
}

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DetailResponse {
  user: UserInfo;
  subscriptions: SubscriptionInfo[];
  usage: AiUsageRecord[];
}

export default function UserDetail({ uid }: UserDetailProps) {
  const { data, isLoading, error, mutate } = useFirestore<DetailResponse>(
    `/api/admin/users/${uid}`
  );
  const [acting, setActing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "messages" | "subscriptions" | "usage"
  >("messages");

  async function toggleBan() {
    if (!data?.user || acting) return;
    setActing(true);
    try {
      const action = data.user.is_banned ? "unban" : "ban";
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      await mutate();
      toast({
        title: action === "ban" ? "User banned" : "User unbanned",
        description: `${data.user.email || uid} has been ${action === "ban" ? "banned" : "unbanned"}.`,
        variant: action === "ban" ? "destructive" : "default",
      });
    } catch {
      toast({
        title: "Action failed",
        description: "Could not update user status. Try again.",
        variant: "destructive",
      });
    } finally {
      setActing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        User not found or failed to load.
      </div>
    );
  }

  const { user, subscriptions, usage } = data;

  return (
    <section className="space-y-5">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Users
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold">{user.email || "No email"}</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user.uid} · {user.app_id}
              </p>
              <div className="mt-2">
                <Badge variant={user.is_banned ? "destructive" : "success"}>
                  {user.is_banned ? "Banned" : "Active"}
                </Badge>
              </div>
            </div>
            <Button
              onClick={toggleBan}
              disabled={acting}
              variant={user.is_banned ? "default" : "destructive"}
              size="sm"
            >
              {user.is_banned ? (
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Ban className="mr-1.5 h-3.5 w-3.5" />
              )}
              {acting ? "..." : user.is_banned ? "Unban User" : "Ban User"}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Joined
              </p>
              <p className="mt-0.5 tabular-nums">
                {ts(user.created_at?._seconds)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Last Seen
              </p>
              <p className="mt-0.5 tabular-nums">
                {ts(user.last_seen?._seconds)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["messages", "subscriptions", "usage"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "messages"
              ? "Messages"
              : tab === "subscriptions"
                ? "Subscriptions"
                : "AI Usage (30d)"}
          </button>
        ))}
      </div>

      {activeTab === "messages" && <UserMessages uid={uid} />}

      {activeTab === "subscriptions" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Subscription History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscriptions.</p>
            ) : (
              <div className="space-y-2">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{sub.plan_type}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {sub.product_id}
                      </span>
                    </div>
                    <Badge
                      variant={
                        sub.status === "active" ? "success" : "secondary"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "usage" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              AI Usage (Last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usage recorded.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Msgs</TableHead>
                      <TableHead className="text-xs">Tokens</TableHead>
                      <TableHead className="text-xs">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs tabular-nums">
                          {u.date}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {u.message_count}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {(u.token_input + u.token_output).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          ${u.cost_usd.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
