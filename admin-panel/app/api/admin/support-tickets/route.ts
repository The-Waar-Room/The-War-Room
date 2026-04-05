import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupportTickets, getTicketStats } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("app") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await getTicketStats(appId);
      return NextResponse.json({ stats });
    }

    const [result, stats] = await Promise.all([
      getSupportTickets(appId, status as any, limit, offset),
      getTicketStats(appId),
    ]);

    return NextResponse.json({ ...result, stats });
  } catch (err) {
    console.error("[api/support-tickets] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
