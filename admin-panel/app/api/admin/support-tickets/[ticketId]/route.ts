import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSupportTicketDetail,
  adminReplyToTicket,
  updateTicketStatus,
} from "@/lib/firestore";
import type { TicketStatus } from "@/lib/firestore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ticketId } = await params;
    const result = await getSupportTicketDetail(ticketId);
    if (!result.ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/support-tickets/[ticketId]] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "reply") {
      const message = body.message?.trim();
      if (!message || message.length < 1) {
        return NextResponse.json(
          { error: "Message is required" },
          { status: 400 }
        );
      }
      const ok = await adminReplyToTicket(
        ticketId,
        session.user.email!,
        message.slice(0, 2000)
      );
      if (!ok) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "updateStatus") {
      const validStatuses: TicketStatus[] = [
        "open",
        "waiting_for_customer",
        "waiting_for_support",
        "resolved",
        "closed",
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      const ok = await updateTicketStatus(ticketId, body.status);
      if (!ok) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[api/support-tickets/[ticketId]] POST failed:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
