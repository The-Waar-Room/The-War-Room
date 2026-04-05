import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserMessages,
  getUserMessageStats,
  getAdminRole,
} from "@/lib/firestore";

export async function GET(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = await getAdminRole(session.user.email);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [result, stats] = await Promise.all([
    getUserMessages(params.uid, role, limit, offset),
    getUserMessageStats(params.uid),
  ]);

  return NextResponse.json({ ...result, stats });
}
