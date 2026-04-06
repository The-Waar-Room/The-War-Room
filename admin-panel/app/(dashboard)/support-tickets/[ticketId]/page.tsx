"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useFirestore } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Send,
  Clock,
  User,
  Headphones,
  RefreshCw,
  Crown,
  LifeBuoy,
} from "lucide-react";
import type {
  SupportTicket,
  TicketMessage,
  TicketStatus,
} from "@/lib/firestore";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusOptions: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "waiting_for_customer", label: "Waiting Customer" },
  { value: "waiting_for_support", label: "Waiting Support" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const statusVariant: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
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
  const { data: session } = useSession();
  const { toast } = useToast();
  const canReplyAsOwner = session?.user?.role === "owner";
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [replyRole, setReplyRole] = useState<"owner" | "support">("support");

  useEffect(() => {
    if (canReplyAsOwner) {
      setReplyRole("owner");
    } else {
      setReplyRole("support");
    }
  }, [canReplyAsOwner]);

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
      const outgoingMessage =
        replyRole === "owner" ? `[Owner] ${reply.trim()}` : reply.trim();

      const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", message: outgoingMessage }),
      });
      if (!res.ok) throw new Error("Failed");
      setReply("");
      toast({
        title:
          replyRole === "owner" ? "Owner reply sent" : "Support reply sent",
      });
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
        <Link href="/support-messages">
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
        <Link href="/support-messages">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[#0F172A] md:text-xl">
            {ticket.subject}
          </h1>
          <p className="text-xs text-muted-foreground">
            {ticket.ticket_id} · {ticket.email} · {ticket.app_id}
            {ticket.version ? ` v${ticket.version}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Ticket Info Card */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Badge
              variant={statusVariant[ticket.status]}
              className="mt-1 text-xs"
            >
              {ticket.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Priority
            </p>
            <Badge
              variant={
                ticket.priority === "high"
                  ? "destructive"
                  : ticket.priority === "low"
                    ? "secondary"
                    : "outline"
              }
              className="mt-1 text-xs font-bold"
            >
              {ticket.priority.charAt(0).toUpperCase() +
                ticket.priority.slice(1)}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Created</p>
            <p className="mt-1 text-sm">{formatTime(ticket.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Updated</p>
            <p className="mt-1 text-sm">{formatTime(ticket.updated_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Status change */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm font-medium text-muted-foreground">
            Change status:
          </span>
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

      <Card className="border-[#B2CCFF] bg-gradient-to-r from-[#EEF4FF] via-[#F8FAFF] to-white">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                Direct User Chat Panel
              </p>
              <p className="text-xs text-[#475467]">
                Choose who is replying, then send a direct response to the user.
              </p>
            </div>
            <Tabs
              value={replyRole}
              onValueChange={(value) =>
                setReplyRole(value as "owner" | "support")
              }
            >
              <TabsList
                className={`grid w-[220px] border border-[#D0D5DD] bg-white ${
                  canReplyAsOwner ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {canReplyAsOwner && (
                  <TabsTrigger value="owner" className="gap-1.5 text-xs">
                    <Crown className="h-3.5 w-3.5" /> Owner
                  </TabsTrigger>
                )}
                <TabsTrigger value="support" className="gap-1.5 text-xs">
                  <LifeBuoy className="h-3.5 w-3.5" /> Support
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setReply("Thanks for reporting this. We are checking it now.")
              }
            >
              Use acknowledgement template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setReply(
                  "We fixed this in the latest build. Please update and confirm."
                )
              }
            >
              Use resolution template
            </Button>
          </div>
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
            Conversation ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                className={`flex gap-3 ${isSupport ? "justify-end" : "justify-start"}`}
              >
                {!isSupport && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isSupport
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted text-foreground"
                  }`}
                >
                  {isSupport && (
                    <p className="mb-0.5 text-[10px] font-semibold opacity-70">
                      Admin
                    </p>
                  )}
                  {!isSupport && (
                    <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
                      {msg.sender_id || "Customer"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.message}
                  </p>
                  <div
                    className={`mt-1.5 flex items-center gap-1 text-[10px] ${
                      isSupport ? "opacity-60" : "text-muted-foreground"
                    }`}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(msg.created_at)}
                  </div>
                </div>
                {isSupport && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Headphones className="h-4 w-4" />
                  </div>
                )}
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
              placeholder={`Type your ${replyRole} reply to the customer…`}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleReply()
              }
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
              {replyRole === "owner" ? "Reply as Owner" : "Reply as Support"}
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
