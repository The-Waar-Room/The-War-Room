import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCloudUsageSummary } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const summary = await getCloudUsageSummary(days);
  return NextResponse.json(summary);
}
