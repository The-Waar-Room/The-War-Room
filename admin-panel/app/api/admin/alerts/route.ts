import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAlerts } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("app") || "all";
    const alerts = await getAlerts(appId);
    return NextResponse.json({ alerts });
  } catch (err) {
    console.error("[api/alerts] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to compute alerts" },
      { status: 500 }
    );
  }
}
