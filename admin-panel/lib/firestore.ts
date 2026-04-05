import { adminDb } from "@/lib/firebase-admin";

export const INR_RATE = 84;

export type AdminRole = "owner" | "admin" | "viewer" | null;

// ── Shared types ──

export interface AppInfo {
  id: string;
  app_id: string;
  app_name: string;
  platform: string;
  is_active: boolean;
  secret_hash: string;
  created_at?: { _seconds: number };
}

export interface UserInfo {
  id: string;
  uid: string;
  app_id: string;
  email: string;
  is_banned?: boolean;
  created_at?: { _seconds: number };
  last_seen?: { _seconds: number };
}

export interface SubscriptionInfo {
  id: string;
  user_id: string;
  app_id: string;
  plan_type: string;
  product_id: string;
  status: string;
  starts_at?: string;
  expires_at?: string;
  verified_at?: { _seconds: number };
}

export interface AiUsageRecord {
  id: string;
  user_id: string;
  app_id: string;
  date: string;
  message_count: number;
  token_input: number;
  token_output: number;
  cost_usd: number;
}

export interface GlobalConfig {
  kill_switch: boolean;
  plans: Record<
    string,
    {
      daily_messages: number;
      max_input_tokens: number;
      max_output_tokens: number;
    }
  >;
  budgets?: {
    vertex_ai: number;
    cloud_run: number;
    firebase: number;
  };
  _updated_at?: { _seconds: number };
}

export interface DashboardSummary {
  totalUsers: number;
  activeSubscriptions: number;
  messagesToday: number;
  aiCostUsd: number;
  aiCostInr: number;
  revenueMonthInr: number;
  profitInr: number;
  messagesByDay: Array<{ date: string; value: number }>;
  revenueByMonth: Array<{ month: string; value: number }>;
  updatedAt: string;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getAdminRole(email?: string | null): Promise<AdminRole> {
  if (!email) return null;
  const normalized = email.toLowerCase();
  const doc = await adminDb.collection("admins").doc(normalized).get();
  if (!doc.exists) return null;
  const role = doc.data()?.role;
  if (role === "owner" || role === "admin" || role === "viewer") {
    return role;
  }
  return null;
}

export async function getDashboardSummary(
  appId: string = "all"
): Promise<DashboardSummary> {
  const today = new Date();
  const todayKey = toDateKey(today);

  // Date range for messagesByDay: last 30 days
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoKey = toDateKey(thirtyDaysAgo);

  const usersQuery =
    appId === "all"
      ? adminDb.collection("users")
      : adminDb.collection("users").where("app_id", "==", appId);

  const subsQuery =
    appId === "all"
      ? adminDb.collection("subscriptions").where("status", "==", "active")
      : adminDb
          .collection("subscriptions")
          .where("status", "==", "active")
          .where("app_id", "==", appId);

  // Fetch last 30 days of usage for messagesByDay chart
  let usageLast30Query: FirebaseFirestore.Query =
    adminDb.collection("ai_usage");
  if (appId !== "all") {
    usageLast30Query = usageLast30Query.where("app_id", "==", appId);
  }
  usageLast30Query = usageLast30Query
    .where("date", ">=", thirtyDaysAgoKey)
    .orderBy("date", "desc")
    .limit(5000);

  const [usersCountSnap, activeSubsSnap, usageLast30Snap] = await Promise.all([
    usersQuery.count().get(),
    subsQuery.count().get(),
    usageLast30Query.get(),
  ]);

  let messagesToday = 0;
  let aiCostUsd = 0;
  const messagesByDayMap: Record<string, number> = {};

  for (const doc of usageLast30Snap.docs) {
    const data = doc.data();
    const date = data.date as string;
    const count = Number(data.message_count || 0);
    const cost = Number(data.cost_usd || 0);

    messagesByDayMap[date] = (messagesByDayMap[date] || 0) + count;

    if (date === todayKey) {
      messagesToday += count;
      aiCostUsd += cost;
    }
  }

  // Build messagesByDay array sorted ascending
  const messagesByDay = Object.entries(messagesByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Revenue by month: last 6 months
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const monthSubsQuery =
    appId === "all"
      ? adminDb.collection("subscriptions")
      : adminDb.collection("subscriptions").where("app_id", "==", appId);

  const allSubs = await monthSubsQuery.get();
  const revenueByMonthMap: Record<string, number> = {};
  let revenueMonthInr = 0;

  allSubs.docs.forEach((doc) => {
    const data = doc.data();
    const verifiedAt = data.verified_at?.toDate?.();
    if (!verifiedAt) return;
    const priceInr = Number(data.price_inr || 0);

    if (verifiedAt >= sixMonthsAgo) {
      const monthKey = `${verifiedAt.getFullYear()}-${String(verifiedAt.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonthMap[monthKey] =
        (revenueByMonthMap[monthKey] || 0) + priceInr;
    }

    if (verifiedAt >= monthStart) {
      revenueMonthInr += priceInr;
    }
  });

  const revenueByMonth = Object.entries(revenueByMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const aiCostInr = aiCostUsd * INR_RATE;
  const infraCostInr = 0;
  const profitInr = revenueMonthInr - aiCostInr - infraCostInr;

  return {
    totalUsers: usersCountSnap.data().count,
    activeSubscriptions: activeSubsSnap.data().count,
    messagesToday,
    aiCostUsd,
    aiCostInr,
    revenueMonthInr,
    profitInr,
    messagesByDay,
    revenueByMonth,
    updatedAt: new Date().toISOString(),
  };
}

// ── Apps ──

export async function getAppsList(): Promise<AppInfo[]> {
  const snap = await adminDb.collection("apps").get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AppInfo, "id">),
  }));
}

export async function getAppWithStats(appId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [usersSnap, subsSnap, usageSnap] = await Promise.all([
    adminDb.collection("users").where("app_id", "==", appId).count().get(),
    adminDb
      .collection("subscriptions")
      .where("app_id", "==", appId)
      .where("status", "==", "active")
      .count()
      .get(),
    adminDb
      .collection("ai_usage")
      .where("app_id", "==", appId)
      .where("date", "==", today)
      .get(),
  ]);

  let messagesToday = 0;
  let costToday = 0;
  for (const doc of usageSnap.docs) {
    const d = doc.data();
    messagesToday += Number(d.message_count || 0);
    costToday += Number(d.cost_usd || 0);
  }

  return {
    userCount: usersSnap.data().count,
    activeSubscriptions: subsSnap.data().count,
    messagesToday,
    costTodayUsd: costToday,
  };
}

// ── Users ──

export async function getUsers(
  appId?: string,
  limit = 50,
  offset = 0
): Promise<{ users: UserInfo[]; total: number }> {
  let query: FirebaseFirestore.Query = adminDb.collection("users");
  if (appId && appId !== "all") {
    query = query.where("app_id", "==", appId);
  }

  const countSnap = await query.count().get();
  const total = countSnap.data().count;

  const snap = await query
    .orderBy("created_at", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  const users = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<UserInfo, "id">),
  }));

  return { users, total };
}

export async function getUserDetail(uid: string) {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;

  const userData = { id: userDoc.id, ...userDoc.data() } as UserInfo;

  const [subsSnap, usageSnap] = await Promise.all([
    adminDb
      .collection("subscriptions")
      .where("user_id", "==", uid)
      .orderBy("verified_at", "desc")
      .limit(10)
      .get(),
    adminDb
      .collection("ai_usage")
      .where("user_id", "==", uid)
      .orderBy("date", "desc")
      .limit(30)
      .get(),
  ]);

  const subscriptions = subsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SubscriptionInfo, "id">),
  }));

  const usage = usageSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AiUsageRecord, "id">),
  }));

  return { user: userData, subscriptions, usage };
}

export async function banUser(uid: string) {
  await adminDb.collection("users").doc(uid).update({ is_banned: true });
}

export async function unbanUser(uid: string) {
  await adminDb.collection("users").doc(uid).update({ is_banned: false });
}

// ── Subscriptions ──

export async function getSubscriptions(
  appId?: string,
  status?: string,
  limit = 50
): Promise<SubscriptionInfo[]> {
  let query: FirebaseFirestore.Query = adminDb.collection("subscriptions");
  if (appId && appId !== "all") {
    query = query.where("app_id", "==", appId);
  }
  if (status) {
    query = query.where("status", "==", status);
  }

  const snap = await query.orderBy("verified_at", "desc").limit(limit).get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<SubscriptionInfo, "id">),
  }));
}

export async function getSubscriptionStats(appId?: string) {
  const baseQuery =
    appId && appId !== "all"
      ? adminDb.collection("subscriptions").where("app_id", "==", appId)
      : adminDb.collection("subscriptions");

  const [activeSnap, totalSnap] = await Promise.all([
    baseQuery.where("status", "==", "active").count().get(),
    baseQuery.count().get(),
  ]);

  // Get plan distribution
  const activeSubs = await (
    appId && appId !== "all"
      ? adminDb
          .collection("subscriptions")
          .where("app_id", "==", appId)
          .where("status", "==", "active")
      : adminDb.collection("subscriptions").where("status", "==", "active")
  ).get();

  const planCounts: Record<string, number> = {};
  activeSubs.docs.forEach((doc) => {
    const plan = doc.data().plan_type || "unknown";
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });

  return {
    active: activeSnap.data().count,
    total: totalSnap.data().count,
    planDistribution: planCounts,
  };
}

// ── AI Usage ──

export async function getAiUsageRecords(
  appId?: string,
  days = 7
): Promise<AiUsageRecord[]> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  let query: FirebaseFirestore.Query = adminDb.collection("ai_usage");
  if (appId && appId !== "all") {
    query = query.where("app_id", "==", appId);
  }
  // Fetch last N days
  query = query
    .where("date", ">=", dates[dates.length - 1])
    .orderBy("date", "desc")
    .limit(500);

  const snap = await query.get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AiUsageRecord, "id">),
  }));
}

export async function getAiUsageSummary(appId?: string, days = 7) {
  const records = await getAiUsageRecords(appId, days);

  let totalMessages = 0;
  let totalTokenInput = 0;
  let totalTokenOutput = 0;
  let totalCostUsd = 0;

  const byDay: Record<string, { messages: number; cost: number }> = {};

  for (const r of records) {
    totalMessages += r.message_count;
    totalTokenInput += r.token_input;
    totalTokenOutput += r.token_output;
    totalCostUsd += r.cost_usd;

    if (!byDay[r.date]) byDay[r.date] = { messages: 0, cost: 0 };
    byDay[r.date].messages += r.message_count;
    byDay[r.date].cost += r.cost_usd;
  }

  const dailyBreakdown = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return {
    totalMessages,
    totalTokenInput,
    totalTokenOutput,
    totalCostUsd,
    totalCostInr: totalCostUsd * INR_RATE,
    dailyBreakdown,
  };
}

// ── Cloud Usage (aggregated) ──

export interface CloudUsageSummary {
  vertexAi: {
    totalCostUsd: number;
    totalMessages: number;
    totalTokenInput: number;
    totalTokenOutput: number;
    inputCostUsd: number;
    outputCostUsd: number;
    avgTokensPerMessage: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      messages: number;
      tokenInput: number;
      tokenOutput: number;
    }>;
  };
  firebase: {
    firestoreReads: number;
    firestoreWrites: number;
    authUsers: number;
    readCostUsd: number;
    writeCostUsd: number;
    estimatedCostUsd: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      reads: number;
      writes: number;
    }>;
  };
  cloudRun: {
    estimatedRequestCount: number;
    estimatedCpuSeconds: number;
    estimatedMemoryGbSeconds: number;
    requestCostUsd: number;
    computeCostUsd: number;
    estimatedCostUsd: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      requests: number;
    }>;
  };
  budgets: {
    vertex_ai: number;
    cloud_run: number;
    firebase: number;
  };
  totalCostUsd: number;
  totalCostInr: number;
  daysInPeriod: number;
  dailyBreakdown: Array<{
    date: string;
    vertexAi: number;
    firebase: number;
    cloudRun: number;
    total: number;
  }>;
}

export async function getCloudUsageSummary(
  days = 30
): Promise<CloudUsageSummary> {
  const [records, configDoc, usersSnap] = await Promise.all([
    getAiUsageRecords(undefined, days),
    adminDb.collection("config").doc("global").get(),
    adminDb.collection("users").count().get(),
  ]);

  const config = configDoc.data() as GlobalConfig | undefined;
  const budgets = config?.budgets ?? {
    vertex_ai: 40,
    cloud_run: 10,
    firebase: 10,
  };

  let totalMessages = 0;
  let totalTokenInput = 0;
  let totalTokenOutput = 0;
  let totalVertexCost = 0;

  const byDay: Record<
    string,
    {
      messages: number;
      vertexCost: number;
      tokenInput: number;
      tokenOutput: number;
    }
  > = {};

  for (const r of records) {
    totalMessages += r.message_count;
    totalTokenInput += r.token_input;
    totalTokenOutput += r.token_output;
    totalVertexCost += r.cost_usd;

    if (!byDay[r.date])
      byDay[r.date] = {
        messages: 0,
        vertexCost: 0,
        tokenInput: 0,
        tokenOutput: 0,
      };
    byDay[r.date].messages += r.message_count;
    byDay[r.date].vertexCost += r.cost_usd;
    byDay[r.date].tokenInput += r.token_input;
    byDay[r.date].tokenOutput += r.token_output;
  }

  // Gemini 2.5 Flash pricing: $0.15/1M input, $0.60/1M output (approx)
  const inputCostUsd = (totalTokenInput / 1_000_000) * 0.15;
  const outputCostUsd = (totalTokenOutput / 1_000_000) * 0.6;

  // Firestore estimates: ~$0.06/100K reads, ~$0.18/100K writes
  const firestoreReads = totalMessages * 3;
  const firestoreWrites = totalMessages * 2;
  const readCostUsd = (firestoreReads / 100_000) * 0.06;
  const writeCostUsd = (firestoreWrites / 100_000) * 0.18;
  const firestoreCost = readCostUsd + writeCostUsd;

  const authUsers = usersSnap.data().count;

  // Cloud Run estimates
  const cloudRunRequests = totalMessages;
  const estimatedCpuSeconds = cloudRunRequests * 0.5; // ~0.5s CPU per request
  const estimatedMemoryGbSeconds = cloudRunRequests * 0.256; // 256MB per request
  const requestCostUsd = cloudRunRequests * 0.0000004; // $0.40/million
  const computeCostUsd =
    estimatedCpuSeconds * 0.000024 + estimatedMemoryGbSeconds * 0.0000025;
  const cloudRunCost = requestCostUsd + computeCostUsd;

  const totalCostUsd = totalVertexCost + firestoreCost + cloudRunCost;
  const avgTokensPerMessage =
    totalMessages > 0
      ? Math.round((totalTokenInput + totalTokenOutput) / totalMessages)
      : 0;

  const sortedDays = Object.entries(byDay).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  const vertexAiDaily = sortedDays.map(([date, d]) => ({
    date,
    cost: d.vertexCost,
    messages: d.messages,
    tokenInput: d.tokenInput,
    tokenOutput: d.tokenOutput,
  }));

  const firebaseDaily = sortedDays.map(([date, d]) => {
    const reads = d.messages * 3;
    const writes = d.messages * 2;
    return {
      date,
      cost: (reads / 100_000) * 0.06 + (writes / 100_000) * 0.18,
      reads,
      writes,
    };
  });

  const cloudRunDaily = sortedDays.map(([date, d]) => ({
    date,
    cost:
      d.messages * 0.0000004 +
      d.messages * 0.5 * 0.000024 +
      d.messages * 0.256 * 0.0000025,
    requests: d.messages,
  }));

  const dailyBreakdown = sortedDays.map(([date, data]) => {
    const dayFirestore =
      ((data.messages * 3) / 100_000) * 0.06 +
      ((data.messages * 2) / 100_000) * 0.18;
    const dayCloudRun =
      data.messages * 0.0000004 +
      data.messages * 0.5 * 0.000024 +
      data.messages * 0.256 * 0.0000025;
    return {
      date,
      vertexAi: data.vertexCost,
      firebase: dayFirestore,
      cloudRun: dayCloudRun,
      total: data.vertexCost + dayFirestore + dayCloudRun,
    };
  });

  return {
    vertexAi: {
      totalCostUsd: totalVertexCost,
      totalMessages,
      totalTokenInput,
      totalTokenOutput,
      inputCostUsd,
      outputCostUsd,
      avgTokensPerMessage,
      dailyBreakdown: vertexAiDaily,
    },
    firebase: {
      firestoreReads,
      firestoreWrites,
      authUsers,
      readCostUsd,
      writeCostUsd,
      estimatedCostUsd: firestoreCost,
      dailyBreakdown: firebaseDaily,
    },
    cloudRun: {
      estimatedRequestCount: cloudRunRequests,
      estimatedCpuSeconds,
      estimatedMemoryGbSeconds,
      requestCostUsd,
      computeCostUsd,
      estimatedCostUsd: cloudRunCost,
      dailyBreakdown: cloudRunDaily,
    },
    budgets,
    totalCostUsd,
    totalCostInr: totalCostUsd * INR_RATE,
    daysInPeriod: days,
    dailyBreakdown,
  };
}

// ── Config ──

export async function getGlobalConfig(): Promise<GlobalConfig | null> {
  const doc = await adminDb.collection("config").doc("global").get();
  if (!doc.exists) return null;
  return doc.data() as GlobalConfig;
}

export async function updateKillSwitch(enabled: boolean) {
  const { FieldValue } = await import("firebase-admin/firestore");
  await adminDb.collection("config").doc("global").update({
    kill_switch: enabled,
    _updated_at: FieldValue.serverTimestamp(),
  });
}

export async function updatePlanLimits(
  plan: string,
  limits: {
    daily_messages: number;
    max_input_tokens: number;
    max_output_tokens: number;
  }
) {
  const { FieldValue } = await import("firebase-admin/firestore");
  await adminDb
    .collection("config")
    .doc("global")
    .update({
      [`plans.${plan}`]: limits,
      _updated_at: FieldValue.serverTimestamp(),
    });
}

// ── Budgets ──

export async function updateBudgets(budgets: {
  vertex_ai: number;
  cloud_run: number;
  firebase: number;
}) {
  const { FieldValue } = await import("firebase-admin/firestore");
  await adminDb.collection("config").doc("global").update({
    budgets,
    _updated_at: FieldValue.serverTimestamp(),
  });
}

// ── Admins ──

export async function getAdminsList(): Promise<
  Array<{ email: string; role: string }>
> {
  const snap = await adminDb.collection("admins").get();
  return snap.docs.map((doc) => ({
    email: doc.id,
    role: doc.data().role || "viewer",
  }));
}

// ── Chat Events (per-request drilldown) ──

export interface ChatEventInfo {
  id: string;
  user_id: string;
  app_id: string;
  session_id: string;
  prompt: string;
  response: string;
  context_preview: string;
  context_hash: string;
  token_input: number;
  token_output: number;
  cost_usd: number;
  plan_type: string;
  status: string;
  latency_ms: number;
  created_at?: string;
}

export interface UserMessageStats {
  totalMessages: number;
  totalTokenInput: number;
  totalTokenOutput: number;
  totalCostUsd: number;
  avgTokensPerRequest: number;
  avgLatencyMs: number;
  errorRate: number;
  errors: number;
}

/**
 * Get paginated chat events for a user.
 * Masks prompt/response for 'viewer' role.
 */
export async function getUserMessages(
  uid: string,
  role: AdminRole,
  limit = 50,
  offset = 0
): Promise<{ messages: ChatEventInfo[]; total: number }> {
  const baseQuery = adminDb
    .collection("chat_events")
    .where("user_id", "==", uid);

  const countSnap = await baseQuery.count().get();
  const total = countSnap.data().count;

  const snap = await baseQuery
    .orderBy("created_at", "desc")
    .offset(offset)
    .limit(limit)
    .get();

  const maskContent = role === "viewer";

  const messages: ChatEventInfo[] = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      user_id: d.user_id,
      app_id: d.app_id,
      session_id: d.session_id,
      prompt: maskContent ? "[masked]" : d.prompt,
      response: maskContent ? "[masked]" : d.response,
      context_preview: maskContent ? "[masked]" : d.context_preview || "",
      context_hash: d.context_hash || "",
      token_input: d.token_input || 0,
      token_output: d.token_output || 0,
      cost_usd: d.cost_usd || 0,
      plan_type: d.plan_type || "free",
      status: d.status || "success",
      latency_ms: d.latency_ms || 0,
      created_at: d.created_at?.toDate?.()?.toISOString() ?? null,
    };
  });

  return { messages, total };
}

/**
 * Get aggregated message stats for a user (last 30 days).
 */
export async function getUserMessageStats(
  uid: string
): Promise<UserMessageStats> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const snap = await adminDb
    .collection("chat_events")
    .where("user_id", "==", uid)
    .where("created_at", ">=", thirtyDaysAgo)
    .get();

  let totalMessages = 0;
  let totalTokenInput = 0;
  let totalTokenOutput = 0;
  let totalCostUsd = 0;
  let totalLatencyMs = 0;
  let errors = 0;

  snap.docs.forEach((doc) => {
    const d = doc.data();
    totalMessages++;
    totalTokenInput += d.token_input || 0;
    totalTokenOutput += d.token_output || 0;
    totalCostUsd += d.cost_usd || 0;
    totalLatencyMs += d.latency_ms || 0;
    if (d.status === "error") errors++;
  });

  return {
    totalMessages,
    totalTokenInput,
    totalTokenOutput,
    totalCostUsd,
    avgTokensPerRequest:
      totalMessages > 0
        ? Math.round((totalTokenInput + totalTokenOutput) / totalMessages)
        : 0,
    avgLatencyMs:
      totalMessages > 0 ? Math.round(totalLatencyMs / totalMessages) : 0,
    errorRate: totalMessages > 0 ? +(errors / totalMessages).toFixed(4) : 0,
    errors,
  };
}

// ── Dashboard: Top Users by Cost ──

export interface TopUserByCost {
  user_id: string;
  email: string;
  totalCostUsd: number;
  messageCount: number;
}

export async function getTopUsersByCost(
  appId: string = "all",
  days = 30,
  limit = 10
): Promise<TopUserByCost[]> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  let query: FirebaseFirestore.Query = adminDb.collection("ai_usage");
  if (appId !== "all") {
    query = query.where("app_id", "==", appId);
  }
  query = query
    .where("date", ">=", dates[dates.length - 1])
    .orderBy("date", "desc")
    .limit(5000);

  const snap = await query.get();

  const byUser: Record<string, { cost: number; messages: number }> = {};
  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = d.user_id;
    if (!byUser[uid]) byUser[uid] = { cost: 0, messages: 0 };
    byUser[uid].cost += d.cost_usd || 0;
    byUser[uid].messages += d.message_count || 0;
  }

  const sorted = Object.entries(byUser)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .slice(0, limit);

  // Batch-fetch user emails
  const results: TopUserByCost[] = [];
  for (const [uid, stats] of sorted) {
    let email = uid;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) email = userDoc.data()?.email || uid;
    } catch {
      // use uid as fallback
    }
    results.push({
      user_id: uid,
      email,
      totalCostUsd: stats.cost,
      messageCount: stats.messages,
    });
  }

  return results;
}
