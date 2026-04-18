import { Request } from "express";

// ── Firestore document types ──

export interface AppDoc {
  app_id: string;
  app_name: string;
  secret_hash: string;
  platform: "android" | "ios" | "both";
  is_active: boolean;
  created_at: FirebaseFirestore.Timestamp;
}

export interface UserDoc {
  uid: string;
  app_id: string;
  email: string;
  created_at: FirebaseFirestore.Timestamp;
  last_seen: FirebaseFirestore.Timestamp;
  is_banned?: boolean;
}

export interface SubscriptionDoc {
  user_id: string;
  app_id: string;
  plan_type: PlanType;
  purchase_token: string;
  product_id: string;
  status: "active" | "expired" | "cancelled";
  starts_at: FirebaseFirestore.Timestamp;
  expires_at: FirebaseFirestore.Timestamp;
  verified_at: FirebaseFirestore.Timestamp;
  raw_google_response: Record<string, unknown>;
}

export type SubscriptionEventType =
  | "purchase_started"
  | "purchase_pending"
  | "purchase_cancelled"
  | "purchase_failed"
  | "verify_success"
  | "verify_failed"
  | "status_check"
  | "plan_transition"
  | "restore"
  | "renewed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "revoked"
  | "webhook_received"
  | "reconciliation_mismatch";

export type SubscriptionEventSource = "android_client" | "backend_verify" | "google_play";

export interface AiUsageDoc {
  user_id: string;
  app_id: string;
  date: string;
  message_count: number;
  token_input: number;
  token_output: number;
  cost_usd: number;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PlanLimits {
  daily_messages: number;
  max_input_tokens: number;
  max_output_tokens: number;
}

export interface GlobalConfig {
  kill_switch: boolean;
  plans: Record<ConfigPlanKey, PlanLimits>;
}

// ── Plan & subscription types ──

export type PlanType = "free" | "monthly" | "sixmonth" | "yearly";
export type ConfigPlanKey = "free" | "premium";

/** Maps a subscription plan type to the config plan key for limit lookups */
export function toConfigPlan(planType: PlanType): ConfigPlanKey {
  return planType === "free" ? "free" : "premium";
}

export const PRODUCT_TO_PLAN: Record<string, { plan: PlanType; days: number }> = {
  "premium-monthly": { plan: "monthly", days: 30 },
  "premium-six-month": { plan: "sixmonth", days: 180 },
  "premium-yearly": { plan: "yearly", days: 365 },
};

// ── Extended Express request ──

export interface AuthenticatedRequest extends Request {
  appId?: string;
  appDoc?: AppDoc;
  user?: UserDoc;
  decodedToken?: { uid: string; email?: string };
  planType?: PlanType;
  planLimits?: PlanLimits;
}

// ── API response shapes ──

export interface ChatResponse {
  success: boolean;
  response: string;
  followUpSuggestions?: string[];
  usage: {
    messagesUsedToday: number;
    dailyLimit: number;
    remaining: number;
    plan: PlanType;
  } | null;
  moderation?: {
    action: "allow" | "soft_redirect" | "block";
    category: string;
  };
}

export interface ApiError {
  success: false;
  error: string;
}

// ── Chat request body ──

export interface ChatRequestBody {
  message: string;
  sessionId: string;
  context?: Record<string, unknown>;
  history?: ChatHistoryMessage[];
}

// ── Subscription verify body ──

export interface SubscriptionVerifyBody {
  purchaseToken: string;
  productId: string;
  packageName: string;
  basePlanId: string;
  purchaseState?: number;
  orderId?: string;
  purchaseTimeMillis?: number;
  isAcknowledged?: boolean;
  billingResponseCode?: number;
  billingDebugMessage?: string;
}

export interface SubscriptionEventBody {
  eventType: SubscriptionEventType;
  eventSource?: SubscriptionEventSource;
  planType?: PlanType;
  productId?: string;
  basePlanId?: string;
  purchaseToken?: string;
  purchaseState?: number;
  orderId?: string;
  billingResponseCode?: number;
  billingDebugMessage?: string;
  oldStatus?: string;
  newStatus?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

// ── Chat event (per-request analytics, 30-day TTL) ──

export interface ChatEventDoc {
  user_id: string;
  app_id: string;
  session_id: string;
  prompt: string;
  response: string;
  context_preview: string; // first 512 chars of context JSON
  context_hash: string; // SHA-256 of full context JSON
  token_input: number;
  token_output: number;
  cost_usd: number;
  plan_type: PlanType;
  status: "success" | "error";
  moderation_action?: "allow" | "soft_redirect" | "block";
  moderation_category?: string;
  latency_ms: number;
  created_at: FirebaseFirestore.Timestamp;
  expires_at: Date; // 30-day TTL field for Firestore
}

// ── Subscription lifecycle event ──

export interface SubscriptionEventDoc {
  user_id: string;
  app_id: string;
  event_type: SubscriptionEventType;
  event_source: SubscriptionEventSource;
  plan_type?: string;
  product_id?: string;
  base_plan_id?: string;
  purchase_token?: string;
  purchase_state?: number;
  order_id?: string;
  billing_response_code?: number;
  billing_debug_message?: string;
  old_status?: string;
  new_status?: string;
  metadata?: Record<string, unknown>;
  occurred_at?: FirebaseFirestore.Timestamp;
  created_at: FirebaseFirestore.Timestamp;
}
