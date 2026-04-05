"use client";

import { useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { SupportTicket, TicketStatus } from "@/lib/firestore";
import Link from "next/link";

const PAGE_SIZE = 25;

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof Clock;
  }
> = {
  open: { label: "Open", variant: "destructive", icon: AlertCircle },
  waiting_for_customer: {
    label: "Waiting Customer",
    variant: "outline",
    icon: Clock,
  },
  waiting_for_support: {
    label: "Waiting Support",
    variant: "default",
    icon: MessageSquare,
  },
  resolved: { label: "Resolved", variant: "secondary", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "secondary", icon: XCircle },
};

const statusFilters: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "waiting_for_support", label: "Waiting Support" },
  { value: "waiting_for_customer", label: "Waiting Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function priorityBadge(p: string) {
  if (p === "high")
    return (
      <Badge variant="destructive" className="text-[10px]">
        High
      </Badge>
    );
  if (p === "low")
    return (
      <Badge variant="secondary" className="text-[10px]">
        Low
      </Badge>
    );
  return null;
}

export default function SupportTicketsPage() {
  const { selectedApp } = useSelectedApp();
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const appParam = selectedApp !== "all" ? `&app=${selectedApp}` : "";
  const statusParam = statusFilter ? `&status=${statusFilter}` : "";
  const { data, isLoading, error, mutate } = useFirestore<{
    tickets: SupportTicket[];
    total: number;
    stats: {
      total: number;
      open: number;
      waitingCustomer: number;
      waitingSupport: number;
      resolved: number;
      closed: number;
    };
  }>(
    `/api/admin/support-tickets?limit=${PAGE_SIZE}&offset=${offset}${appParam}${statusParam}`,
    30000
  );

  const stats = data?.stats;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Support Tickets</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data ? `${data.total} tickets` : "Loading..."}
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

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {stats.open}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Waiting Support</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.waitingSupport}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Waiting Customer</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.waitingCustomer}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {stats.resolved}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => {
              setStatusFilter(f.value);
              setOffset(0);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load tickets.
        </div>
      )}

      {data?.tickets && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tickets.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No tickets found.
                  </TableCell>
                </TableRow>
              )}
              {data.tickets.map((ticket) => {
                const sc = statusConfig[ticket.status];
                const Icon = sc.icon;
                return (
                  <TableRow key={ticket.ticket_id}>
                    <TableCell className="font-mono text-xs">
                      {ticket.ticket_id}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ticket.email || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sc.variant} className="gap-1 text-[10px]">
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{priorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {relativeTime(ticket.updated_at)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/support-tickets/${ticket.ticket_id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of{" "}
            {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= data.total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
