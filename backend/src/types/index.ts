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

export interface AiUsageDoc {
  user_id: string;
  app_id: string;
  date: string;
  message_count: number;
  token_input: number;
  token_output: number;
  cost_usd: number;
}

export interface ChatMessageDoc {
  user_id: string;
  app_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used: number;
  created_at: FirebaseFirestore.Timestamp;
}

export interface PlanLimits {
  daily_messages: number;
  max_context_chars: number;
}

export interface GlobalConfig {
  kill_switch: boolean;
  plans: Record<PlanType, PlanLimits>;
}

// ── Plan & subscription types ──

export type PlanType = "free" | "monthly" | "sixmonth" | "yearly";

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
  usage: {
    messagesUsedToday: number;
    dailyLimit: number;
    remaining: number;
    plan: PlanType;
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
}

// ── Subscription verify body ──

export interface SubscriptionVerifyBody {
  purchaseToken: string;
  productId: string;
  packageName: string;
}
