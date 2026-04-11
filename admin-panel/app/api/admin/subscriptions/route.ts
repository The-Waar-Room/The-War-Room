import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAdminAppId } from "@/lib/admin-apps";
import { getSubscriptions, getSubscriptionStats } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = normalizeAdminAppId(searchParams.get("app"));
  const status = searchParams.get("status") || undefined;

  const [subscriptions, stats] = await Promise.all([
    getSubscriptions(appId, status),
    getSubscriptionStats(appId),
  ]);

  return NextResponse.json({ subscriptions, stats });
}
