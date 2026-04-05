import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGlobalConfig,
  updateKillSwitch,
  updatePlanLimits,
  getAdminsList,
} from "@/lib/firestore";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [config, admins] = await Promise.all([
    getGlobalConfig(),
    getAdminsList(),
  ]);

  return NextResponse.json({ config, admins });
}

export async function POST(request: Request) {
  const session = await auth();
  if (
    !session?.user?.role ||
    (session.user.role !== "owner" && session.user.role !== "admin")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === "kill_switch") {
    await updateKillSwitch(body.enabled as boolean);
    return NextResponse.json({ ok: true });
  }

  if (action === "update_plan") {
    await updatePlanLimits(body.plan as string, body.limits);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
