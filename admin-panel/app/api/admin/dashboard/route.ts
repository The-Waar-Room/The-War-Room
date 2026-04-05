import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardSummary, getTopUsersByCost } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("app") || "all";

  const [summary, topUsers] = await Promise.all([
    getDashboardSummary(appId),
    getTopUsersByCost(appId, 30, 5),
  ]);

  return NextResponse.json({ summary, topUsers });
}
