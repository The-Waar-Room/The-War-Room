import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAppsList, getAppWithStats } from "@/lib/firestore";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apps = await getAppsList();

  const appsWithStats = await Promise.all(
    apps.map(async (app) => {
      const stats = await getAppWithStats(app.id);
      return { ...app, ...stats };
    })
  );

  return NextResponse.json({ apps: appsWithStats });
}
