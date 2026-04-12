import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAdminAppId } from "@/lib/admin-apps";
import {
  getSubscriptionEvents,
  getSubscriptionEventStats,
} from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = normalizeAdminAppId(searchParams.get("app"));
  const eventType = searchParams.get("eventType") || undefined;
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const [events, stats] = await Promise.all([
    getSubscriptionEvents(appId, eventType, limit),
    getSubscriptionEventStats(appId),
  ]);

  return NextResponse.json({ events, stats });
}
