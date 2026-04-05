"use client";

import { useState, use } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  Clock,
  User,
  Headphones,
  RefreshCw,
} from "lucide-react";
import type { SupportTicket, TicketMessage, TicketStatus } from "@/lib/firestore";
import Link from "next/link";

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "waiting_for_customer", label: "Waiting Customer" },
  { value: "waiting_for_support", label: "Waiting Support" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const statusVariant: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  waiting_for_customer: "outline",
  waiting_for_support: "default",
  resolved: "secondary",
  closed: "secondary",
};

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = use(params);
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { data, isLoading, error, mutate } = useFirestore<{
    ticket: SupportTicket;
    messages: TicketMessage[];
  }>(`/api/admin/support-tickets/${ticketId}`, 15000);

  const ticket = data?.ticket;
  const messages = data?.messages ?? [];

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", message: reply.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setReply("");
      toast({ title: "Reply sent" });
      mutate();
    } catch {
      toast({ title: "Failed to send reply", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `Status updated to ${newStatus.replace(/_/g, " ")}` });
      mutate();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-60 rounded-lg" />
      </section>
    );
  }

  if (error || !ticket) {
    return (
      <section className="space-y-4">
        <Link href="/support-tickets">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Ticket not found.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/support-tickets">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold md:text-xl">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground">
            {ticket.ticket_id} · {ticket.email} · {ticket.app_id}
            {ticket.version ? ` v${ticket.version}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Status + actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Badge variant={statusVariant[ticket.status]} className="text-xs">
            {ticket.status.replace(/_/g, " ")}
          </Badge>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-muted-foreground">Change to:</span>
          {statusOptions
            .filter((s) => s.value !== ticket.status)
            .map((s) => (
              <Button
                key={s.value}
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(s.value)}
              >
                {s.label}
              </Button>
            ))}
        </CardContent>
      </Card>

      {/* Metadata */}
      {ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Device Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {Object.entries(ticket.metadata).map(([k, v]) => (
              <div key={k}>
                <span className="text-muted-foreground">{k}: </span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Messages thread */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Messages ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          )}
          {messages.map((msg) => {
            const isSupport = msg.sender_type === "support";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isSupport ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isSupport
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isSupport ? (
                    <Headphones className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isSupport
                      ? "bg-primary/10 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(msg.created_at)}
                    <span className="ml-1">{msg.sender_id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reply box */}
      {ticket.status !== "closed" && (
        <Card>
          <CardContent className="flex gap-2 p-4">
            <Input
              placeholder="Type your reply…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              size="sm"
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
