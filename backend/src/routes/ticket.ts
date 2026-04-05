import { Router, Response } from "express";
import { appVerify } from "../middleware/appVerify";
import { authMiddleware } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "../types";
import {
  createTicket,
  listTickets,
  getTicket,
  replyToTicket,
  closeTicket,
  TicketPriority,
  TicketStatus,
} from "../services/ticketService";

export const ticketRouter = Router();

const VALID_PRIORITIES: TicketPriority[] = ["low", "normal", "high"];
const VALID_STATUSES: TicketStatus[] = [
  "open",
  "waiting_for_customer",
  "waiting_for_support",
  "resolved",
  "closed",
];

/**
 * POST /api/ticket
 * Single endpoint for all ticket actions (create, list, get, reply, close).
 * Middleware: appVerify → authMiddleware
 */
ticketRouter.post(
  "/",
  appVerify,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const uid = req.decodedToken!.uid;
      const email = req.decodedToken!.email ?? "";
      const appId = req.appId!;
      const { action } = req.body;

      switch (action) {
        case "create": {
          const { subject, message, priority, app_type, version, metadata } = req.body;

          if (!message || typeof message !== "string" || message.trim().length < 10) {
            res.status(400).json({
              status: "error",
              message: "Message must be at least 10 characters",
            });
            return;
          }

          const safePriority: TicketPriority = VALID_PRIORITIES.includes(priority)
            ? priority
            : "normal";

          const safeSubject =
            typeof subject === "string" ? subject.slice(0, 100) : "Support Request";
          const safeMessage = message.slice(0, 2000);
          const safeVersion = typeof version === "string" ? version.slice(0, 20) : "unknown";
          const safeAppType = typeof app_type === "string" ? app_type.slice(0, 20) : "android";

          // Sanitize metadata: only string key-value pairs, max 10 entries
          let safeMetadata: Record<string, string> = {};
          if (metadata && typeof metadata === "object") {
            const entries = Object.entries(metadata).slice(0, 10);
            for (const [k, v] of entries) {
              if (typeof k === "string" && typeof v === "string") {
                safeMetadata[k.slice(0, 50)] = String(v).slice(0, 200);
              }
            }
          }

          const result = await createTicket(
            uid,
            email,
            appId,
            safeSubject,
            safeMessage,
            safePriority,
            safeAppType,
            safeVersion,
            safeMetadata
          );

          res.json({
            status: "success",
            message: "Ticket created",
            ticket_id: result.ticket_id,
          });
          return;
        }

        case "list": {
          const startIndex = Math.max(0, parseInt(req.body.startIndex) || 0);
          const status: TicketStatus | undefined = VALID_STATUSES.includes(req.body.status)
            ? req.body.status
            : undefined;

          const result = await listTickets(uid, startIndex, status);
          res.json({
            status: "success",
            data: result.tickets,
            loadMore: result.has_more,
            openTickets: result.openTickets,
          });
          return;
        }

        case "get": {
          const { ticket_id } = req.body;
          if (!ticket_id || typeof ticket_id !== "string") {
            res.status(400).json({ status: "error", message: "ticket_id required" });
            return;
          }

          const result = await getTicket(ticket_id, uid);
          if (!result.ticket) {
            res.status(404).json({ status: "error", message: "Ticket not found" });
            return;
          }

          res.json({
            status: "success",
            ticket: result.ticket,
            messages: result.messages,
          });
          return;
        }

        case "reply": {
          const { ticket_id, message } = req.body;
          if (!ticket_id || !message || typeof message !== "string") {
            res.status(400).json({ status: "error", message: "ticket_id and message required" });
            return;
          }

          const safeMsg = message.slice(0, 2000);
          const ok = await replyToTicket(ticket_id, uid, safeMsg);
          if (!ok) {
            res.status(400).json({ status: "error", message: "Cannot reply to this ticket" });
            return;
          }

          res.json({ status: "success", message: "Reply sent" });
          return;
        }

        case "close": {
          const { ticket_id } = req.body;
          if (!ticket_id) {
            res.status(400).json({ status: "error", message: "ticket_id required" });
            return;
          }

          const ok = await closeTicket(ticket_id, uid);
          if (!ok) {
            res.status(400).json({ status: "error", message: "Cannot close this ticket" });
            return;
          }

          res.json({ status: "success", message: "Ticket closed" });
          return;
        }

        default:
          res.status(400).json({ status: "error", message: "Unknown action" });
      }
    } catch (err) {
      console.error("[ticket] Error:", err);
      res.status(500).json({ status: "error", message: "Internal server error" });
    }
  }
);
