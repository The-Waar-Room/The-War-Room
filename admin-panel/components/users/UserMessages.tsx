"use client";

import { useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  DollarSign,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { ChatEventInfo, UserMessageStats } from "@/lib/firestore";

const PAGE_SIZE = 25;

interface MessagesResponse {
  messages: ChatEventInfo[];
  total: number;
  stats: UserMessageStats;
}

function usd(v: number) {
  return `$${v.toFixed(4)}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserMessages({ uid }: { uid: string }) {
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, error } = useFirestore<MessagesResponse>(
    `/api/admin/users/${uid}/messages?limit=${PAGE_SIZE}&offset=${offset}`,
    30000
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load messages.
      </div>
    );
  }

  const { messages, total, stats } = data;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Messages (30d)
              </p>
              <p className="text-lg font-bold tabular-nums">
                {stats.totalMessages.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Cost
              </p>
              <p className="text-lg font-bold tabular-nums">
                {usd(stats.totalCostUsd)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Zap className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Avg Tokens/Req
              </p>
              <p className="text-lg font-bold tabular-nums">
                {stats.avgTokensPerRequest.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Error Rate
              </p>
              <p className="text-lg font-bold tabular-nums">
                {(stats.errorRate * 100).toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages table */}
      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No chat events recorded for this user yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Session</TableHead>
                  <TableHead className="text-xs">Tokens</TableHead>
                  <TableHead className="text-xs">Cost</TableHead>
                  <TableHead className="text-xs">Latency</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => {
                  const isExpanded = expandedId === msg.id;
                  return (
                    <>
                      <TableRow
                        key={msg.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : msg.id)
                        }
                      >
                        <TableCell className="w-8 px-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {formatDate(msg.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {msg.session_id?.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {(
                            msg.token_input + msg.token_output
                          ).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {usd(msg.cost_usd)}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {msg.latency_ms}ms
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {msg.plan_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              msg.status === "success"
                                ? "success"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {msg.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${msg.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                  Prompt
                                </p>
                                <p className="mt-1 whitespace-pre-wrap rounded bg-background p-2 text-xs">
                                  {msg.prompt}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                  Response
                                </p>
                                <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-background p-2 text-xs">
                                  {msg.response}
                                </p>
                              </div>
                              {msg.context_preview &&
                                msg.context_preview !== "[masked]" && (
                                  <div>
                                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                      Context Preview
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs text-muted-foreground">
                                      {msg.context_preview}
                                    </p>
                                  </div>
                                )}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>
                                  Input: {msg.token_input.toLocaleString()} tok
                                </span>
                                <span>
                                  Output: {msg.token_output.toLocaleString()}{" "}
                                  tok
                                </span>
                                <span>
                                  Hash: {msg.context_hash?.slice(0, 12)}…
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
