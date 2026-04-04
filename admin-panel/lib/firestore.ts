import { adminDb } from "@/lib/firebase-admin";

export const INR_RATE = 84;

export type AdminRole = "owner" | "admin" | "viewer" | null;

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

export async function getAppsList() {
  const snap = await adminDb.collection("apps").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
