import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserDetail, banUser, unbanUser } from "@/lib/firestore";

export async function GET(
  _request: Request,
  { params }: { params: { uid: string } }
) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getUserDetail(params.uid);
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const session = await auth();
  if (
    !session?.user?.role ||
    (session.user.role !== "owner" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === "ban") {
    await banUser(params.uid);
    return NextResponse.json({ ok: true, action: "banned" });
  } else if (action === "unban") {
    await unbanUser(params.uid);
    return NextResponse.json({ ok: true, action: "unbanned" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
