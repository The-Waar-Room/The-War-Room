import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateBudgets } from "@/lib/firestore";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.role || session.user.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { vertex_ai, cloud_run, firebase } = body;

  if (
    typeof vertex_ai !== "number" ||
    typeof cloud_run !== "number" ||
    typeof firebase !== "number" ||
    vertex_ai < 0 ||
    cloud_run < 0 ||
    firebase < 0
  ) {
    return NextResponse.json(
      { error: "Invalid budget values" },
      { status: 400 }
    );
  }

  await updateBudgets({ vertex_ai, cloud_run, firebase });
  return NextResponse.json({ success: true });
}
