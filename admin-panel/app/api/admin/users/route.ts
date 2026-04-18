import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeAdminAppId } from "@/lib/admin-apps";
import { getUsers, type UserSortField } from "@/lib/firestore";

const SORT_FIELDS: UserSortField[] = [
  "email",
  "app",
  "status",
  "joined",
  "lastSeen",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const appId = normalizeAdminAppId(searchParams.get("app"));
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");
  const sortFieldParam = searchParams.get("sortField");
  const sortDirectionParam = searchParams.get("sortDirection");

  const sortField: UserSortField = SORT_FIELDS.includes(
    sortFieldParam as UserSortField
  )
    ? (sortFieldParam as UserSortField)
    : "joined";
  const sortDirection = sortDirectionParam === "asc" ? "asc" : "desc";

  const result = await getUsers(appId, limit, offset, sortField, sortDirection);
  return NextResponse.json(result);
}
