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

  const usageQuery =
    appId === "all"
      ? adminDb.collection("ai_usage").where("date", "==", todayKey)
      : adminDb
          .collection("ai_usage")
          .where("date", "==", todayKey)
          .where("app_id", "==", appId);

  const [usersCountSnap, activeSubsSnap, usageSnap] = await Promise.all([
    usersQuery.count().get(),
    subsQuery.count().get(),
    usageQuery.get(),
  ]);

  let messagesToday = 0;
  let aiCostUsd = 0;
  for (const doc of usageSnap.docs) {
    const data = doc.data();
    messagesToday += Number(data.message_count || 0);
    aiCostUsd += Number(data.cost_usd || 0);
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthSubsQuery =
    appId === "all"
      ? adminDb.collection("subscriptions").where("status", "==", "active")
      : adminDb
          .collection("subscriptions")
          .where("status", "==", "active")
          .where("app_id", "==", appId);

  const monthSubs = await monthSubsQuery.get();
  let revenueMonthInr = 0;
  monthSubs.docs.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.verified_at?.toDate?.() || monthStart;
    if (createdAt >= monthStart) {
      revenueMonthInr += Number(data.price_inr || 0);
    }
  });

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
    messagesByDay: [],
    revenueByMonth: [],
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
  };
  firebase: {
    firestoreReads: number;
    firestoreWrites: number;
    authUsers: number;
    estimatedCostUsd: number;
  };
  cloudRun: {
    estimatedRequestCount: number;
    estimatedCostUsd: number;
  };
  totalCostUsd: number;
  totalCostInr: number;
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
  const records = await getAiUsageRecords(undefined, days);

  let totalMessages = 0;
  let totalTokenInput = 0;
  let totalTokenOutput = 0;
  let totalVertexCost = 0;

  const byDay: Record<string, { messages: number; vertexCost: number }> = {};

  for (const r of records) {
    totalMessages += r.message_count;
    totalTokenInput += r.token_input;
    totalTokenOutput += r.token_output;
    totalVertexCost += r.cost_usd;

    if (!byDay[r.date]) byDay[r.date] = { messages: 0, vertexCost: 0 };
    byDay[r.date].messages += r.message_count;
    byDay[r.date].vertexCost += r.cost_usd;
  }

  // Firestore estimates: ~$0.06/100K reads, ~$0.18/100K writes
  // Each chat message ≈ 3 reads (user lookup, config, usage) + 2 writes (usage upsert, log)
  const firestoreReads = totalMessages * 3;
  const firestoreWrites = totalMessages * 2;
  const firestoreCost =
    (firestoreReads / 100_000) * 0.06 + (firestoreWrites / 100_000) * 0.18;

  // Auth users count
  const usersSnap = await adminDb.collection("users").count().get();
  const authUsers = usersSnap.data().count;

  // Cloud Run estimates: ~$0.00002/request + compute
  const cloudRunRequests = totalMessages; // 1 request per message
  const cloudRunCost = cloudRunRequests * 0.00004; // avg cost per request

  const totalCostUsd = totalVertexCost + firestoreCost + cloudRunCost;

  const dailyBreakdown = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => {
      const dayFirestore =
        ((data.messages * 3) / 100_000) * 0.06 +
        ((data.messages * 2) / 100_000) * 0.18;
      const dayCloudRun = data.messages * 0.00004;
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
    },
    firebase: {
      firestoreReads,
      firestoreWrites,
      authUsers,
      estimatedCostUsd: firestoreCost,
    },
    cloudRun: {
      estimatedRequestCount: cloudRunRequests,
      estimatedCostUsd: cloudRunCost,
    },
    totalCostUsd,
    totalCostInr: totalCostUsd * INR_RATE,
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
