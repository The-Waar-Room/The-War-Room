import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAdminAppId } from "@/lib/admin-apps";
import { getAiUsageSummary } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = normalizeAdminAppId(searchParams.get("app"));
  const days = parseInt(searchParams.get("days") || "7");

  const summary = await getAiUsageSummary(appId, days);
  return NextResponse.json(summary);
}
