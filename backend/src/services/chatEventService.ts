import { getFirestore } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { PlanType } from "../types";

// Gemini 2.5 Flash pricing (per 1M tokens)
const INPUT_COST_PER_MILLION = 0.15;
const OUTPUT_COST_PER_MILLION = 0.6;

const TTL_DAYS = 30;

interface WriteChatEventParams {
  userId: string;
  appId: string;
  sessionId: string;
  promptPreview: string;
  response: string;
  contextPreview: string;
  contextHash: string;
  tokenInput: number;
  tokenOutput: number;
  planType: PlanType;
  status: "success" | "error";
  latencyMs: number;
  moderationAction?: "allow" | "soft_redirect" | "block";
  moderationCategory?: string;
}

/**
 * Write a per-request chat event to Firestore for admin drilldown.
 * Non-fatal — caller should .catch() to avoid breaking the chat response.
 */
export async function writeChatEvent(params: WriteChatEventParams): Promise<void> {
  const costUsd =
    (params.tokenInput / 1_000_000) * INPUT_COST_PER_MILLION +
    (params.tokenOutput / 1_000_000) * OUTPUT_COST_PER_MILLION;

  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  const db = getFirestore();
  await db.collection("chat_events").add({
    user_id: params.userId,
    app_id: params.appId,
    session_id: params.sessionId,
    prompt: params.promptPreview,
    response: params.response,
    context_preview: params.contextPreview,
    context_hash: params.contextHash,
    token_input: params.tokenInput,
    token_output: params.tokenOutput,
    cost_usd: costUsd,
    plan_type: params.planType,
    status: params.status,
    latency_ms: params.latencyMs,
    moderation_action: params.moderationAction ?? "allow",
    moderation_category: params.moderationCategory ?? "none",
    created_at: FieldValue.serverTimestamp(),
    expires_at: expiresAt,
  });
}
