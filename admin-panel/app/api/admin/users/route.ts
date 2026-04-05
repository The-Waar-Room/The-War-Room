import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUsers } from "@/lib/firestore";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("app") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const result = await getUsers(appId, limit, offset);
  return NextResponse.json(result);
}
