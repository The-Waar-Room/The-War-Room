import { FieldValue } from "firebase-admin/firestore";
import { getFirestore } from "../config/firebase";

export type TicketStatus =
  | "open"
  | "waiting_for_customer"
  | "waiting_for_support"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high";

export interface TicketDoc {
  ticket_id: string;
  uid: string;
  email: string;
  app_id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  app_type: string;
  version: string;
  metadata?: Record<string, string>;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
}

export interface TicketMessageDoc {
  ticket_id: string;
  message: string;
  sender_type: "customer" | "support";
  sender_id: string;
  created_at: FirebaseFirestore.Timestamp;
}

const TICKETS_COL = "support_tickets";
const MESSAGES_COL = "support_messages";

function generateTicketId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TK-";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function createTicket(
  uid: string,
  email: string,
  appId: string,
  subject: string,
  message: string,
  priority: TicketPriority,
  appType: string,
  version: string,
  metadata?: Record<string, string>
): Promise<{ ticket_id: string }> {
  const db = getFirestore();
  const ticketId = generateTicketId();
  const now = FieldValue.serverTimestamp();

  const ticketData = {
    ticket_id: ticketId,
    uid,
    email,
    app_id: appId,
    subject: subject || "Support Request",
    status: "open" as TicketStatus,
    priority,
    app_type: appType,
    version,
    metadata: metadata || {},
    created_at: now,
    updated_at: now,
  };

  await db.collection(TICKETS_COL).doc(ticketId).set(ticketData);

  await db.collection(MESSAGES_COL).add({
    ticket_id: ticketId,
    message,
    sender_type: "customer",
    sender_id: uid,
    created_at: now,
  });

  return { ticket_id: ticketId };
}

export async function listTickets(
  uid: string,
  startIndex: number,
  status?: TicketStatus
): Promise<{
  tickets: TicketDoc[];
  has_more: boolean;
  openTickets: number;
}> {
  const db = getFirestore();
  const PAGE_SIZE = 20;

  // Count open tickets
  const openSnap = await db
    .collection(TICKETS_COL)
    .where("uid", "==", uid)
    .where("status", "in", ["open", "waiting_for_customer", "waiting_for_support"])
    .count()
    .get();
  const openTickets = openSnap.data().count;

  let query: FirebaseFirestore.Query = db.collection(TICKETS_COL).where("uid", "==", uid);

  if (status) {
    query = query.where("status", "==", status);
  }

  query = query
    .orderBy("updated_at", "desc")
    .offset(startIndex)
    .limit(PAGE_SIZE + 1);

  const snap = await query.get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (TicketDoc & { id: string })[];
  const has_more = docs.length > PAGE_SIZE;
  const tickets = docs.slice(0, PAGE_SIZE).map((d) => ({
    ...d,
    created_at: d.created_at?.toDate?.() ?? new Date(),
    updated_at: d.updated_at?.toDate?.() ?? new Date(),
  }));

  return { tickets: tickets as unknown as TicketDoc[], has_more, openTickets };
}

export async function getTicket(
  ticketId: string,
  uid: string
): Promise<{
  ticket: TicketDoc | null;
  messages: TicketMessageDoc[];
}> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();

  if (!ticketSnap.exists) return { ticket: null, messages: [] };

  const ticket = ticketSnap.data() as TicketDoc;
  if (ticket.uid !== uid) return { ticket: null, messages: [] };

  const msgSnap = await db
    .collection(MESSAGES_COL)
    .where("ticket_id", "==", ticketId)
    .orderBy("created_at", "asc")
    .get();

  const messages = msgSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      created_at: data.created_at?.toDate?.() ?? new Date(),
    };
  }) as unknown as TicketMessageDoc[];

  const serializedTicket = {
    ...ticket,
    created_at: (ticket.created_at as unknown as { toDate: () => Date })?.toDate?.() ?? new Date(),
    updated_at: (ticket.updated_at as unknown as { toDate: () => Date })?.toDate?.() ?? new Date(),
  };

  return { ticket: serializedTicket as unknown as TicketDoc, messages };
}

export async function replyToTicket(
  ticketId: string,
  uid: string,
  message: string
): Promise<boolean> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();

  if (!ticketSnap.exists) return false;
  const ticket = ticketSnap.data() as TicketDoc;
  if (ticket.uid !== uid) return false;
  if (ticket.status === "closed") return false;

  const now = FieldValue.serverTimestamp();

  await db.collection(MESSAGES_COL).add({
    ticket_id: ticketId,
    message,
    sender_type: "customer",
    sender_id: uid,
    created_at: now,
  });

  await db.collection(TICKETS_COL).doc(ticketId).update({
    status: "waiting_for_support",
    updated_at: now,
  });

  return true;
}

export async function closeTicket(ticketId: string, uid: string): Promise<boolean> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();

  if (!ticketSnap.exists) return false;
  const ticket = ticketSnap.data() as TicketDoc;
  if (ticket.uid !== uid) return false;

  await db.collection(TICKETS_COL).doc(ticketId).update({
    status: "closed",
    updated_at: FieldValue.serverTimestamp(),
  });

  return true;
}

// ── Admin functions ──

export async function adminListTickets(
  appId?: string,
  status?: TicketStatus,
  limit = 50,
  offset = 0
): Promise<{ tickets: TicketDoc[]; total: number }> {
  const db = getFirestore();

  let countQuery: FirebaseFirestore.Query = db.collection(TICKETS_COL);
  if (appId && appId !== "all") countQuery = countQuery.where("app_id", "==", appId);
  if (status) countQuery = countQuery.where("status", "==", status);
  const countSnap = await countQuery.count().get();
  const total = countSnap.data().count;

  let query: FirebaseFirestore.Query = db.collection(TICKETS_COL);
  if (appId && appId !== "all") query = query.where("app_id", "==", appId);
  if (status) query = query.where("status", "==", status);
  query = query.orderBy("updated_at", "desc").offset(offset).limit(limit);

  const snap = await query.get();
  const tickets = snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      created_at: data.created_at?.toDate?.()?.toISOString() ?? null,
      updated_at: data.updated_at?.toDate?.()?.toISOString() ?? null,
    };
  }) as unknown as TicketDoc[];

  return { tickets, total };
}

export async function adminGetTicket(
  ticketId: string
): Promise<{ ticket: TicketDoc | null; messages: TicketMessageDoc[] }> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();
  if (!ticketSnap.exists) return { ticket: null, messages: [] };

  const ticket = ticketSnap.data() as TicketDoc;
  const msgSnap = await db
    .collection(MESSAGES_COL)
    .where("ticket_id", "==", ticketId)
    .orderBy("created_at", "asc")
    .get();

  const messages = msgSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      created_at: data.created_at?.toDate?.()?.toISOString() ?? null,
    };
  }) as unknown as TicketMessageDoc[];

  const serializedTicket = {
    ...ticket,
    created_at:
      (ticket.created_at as unknown as { toDate: () => Date })?.toDate?.()?.toISOString() ?? null,
    updated_at:
      (ticket.updated_at as unknown as { toDate: () => Date })?.toDate?.()?.toISOString() ?? null,
  };

  return { ticket: serializedTicket as unknown as TicketDoc, messages };
}

export async function adminReplyToTicket(
  ticketId: string,
  adminId: string,
  message: string
): Promise<boolean> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();
  if (!ticketSnap.exists) return false;

  const now = FieldValue.serverTimestamp();

  await db.collection(MESSAGES_COL).add({
    ticket_id: ticketId,
    message,
    sender_type: "support",
    sender_id: adminId,
    created_at: now,
  });

  await db.collection(TICKETS_COL).doc(ticketId).update({
    status: "waiting_for_customer",
    updated_at: now,
  });

  return true;
}

export async function adminUpdateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
): Promise<boolean> {
  const db = getFirestore();
  const ticketSnap = await db.collection(TICKETS_COL).doc(ticketId).get();
  if (!ticketSnap.exists) return false;

  await db.collection(TICKETS_COL).doc(ticketId).update({
    status: newStatus,
    updated_at: FieldValue.serverTimestamp(),
  });

  return true;
}

export async function adminGetTicketStats(appId?: string): Promise<{
  total: number;
  open: number;
  waitingCustomer: number;
  waitingSupport: number;
  resolved: number;
  closed: number;
}> {
  const db = getFirestore();

  const base =
    appId && appId !== "all"
      ? db.collection(TICKETS_COL).where("app_id", "==", appId)
      : db.collection(TICKETS_COL);

  const [totalSnap, openSnap, wcSnap, wsSnap, resolvedSnap, closedSnap] = await Promise.all([
    base.count().get(),
    base.where("status", "==", "open").count().get(),
    base.where("status", "==", "waiting_for_customer").count().get(),
    base.where("status", "==", "waiting_for_support").count().get(),
    base.where("status", "==", "resolved").count().get(),
    base.where("status", "==", "closed").count().get(),
  ]);

  return {
    total: totalSnap.data().count,
    open: openSnap.data().count,
    waitingCustomer: wcSnap.data().count,
    waitingSupport: wsSnap.data().count,
    resolved: resolvedSnap.data().count,
    closed: closedSnap.data().count,
  };
}
