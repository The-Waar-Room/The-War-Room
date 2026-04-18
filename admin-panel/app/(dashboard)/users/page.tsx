"use client";

import { useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { useFirestore } from "@/hooks/useFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserInfo, UserSortField } from "@/lib/firestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import Link from "next/link";
import { getAdminAppHref } from "@/lib/admin-apps";

const PAGE_SIZE = 25;

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

type SortDirection = "asc" | "desc";

export default function UsersPage() {
  const { selectedApp } = useSelectedApp();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<UserSortField>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const appParam = `&app=${selectedApp}`;
  const { data, isLoading, error } = useFirestore<{
    users: UserInfo[];
    total: number;
  }>(
    `/api/admin/users?limit=${PAGE_SIZE}&offset=${offset}${appParam}&sortField=${sortField}&sortDirection=${sortDirection}`,
    30000
  );

  const searchTerm = normalize(search);

  const filtered = data?.users?.filter((user) => {
    if (!searchTerm) return true;

    const searchableValues = [
      user.email || "",
      user.uid || "",
      user.app_id || "",
      user.is_banned ? "banned" : "active",
      ts(user.created_at?._seconds),
      ts(user.last_seen?._seconds),
    ];

    return searchableValues.some((value) =>
      normalize(value).includes(searchTerm)
    );
  });

  function handleSort(field: UserSortField) {
    setOffset(0);
    if (field === sortField) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortField(field);
    setSortDirection("desc");
  }

  function SortIcon({ field }: { field: UserSortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }

    return sortDirection === "desc" ? (
      <ChevronDown className="h-3.5 w-3.5 text-foreground" />
    ) : (
      <ChevronUp className="h-3.5 w-3.5 text-foreground" />
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Users</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {data ? `${data.total} total users` : "Loading..."}
        </p>
      </div>

      <Input
        placeholder="Filter by email, UID, app, status, joined, or last seen…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load users.
        </div>
      )}

      {filtered && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("email")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    Email
                    <SortIcon field="email" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("app")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    App
                    <SortIcon field="app" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("joined")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    Joined
                    <SortIcon field="joined" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("lastSeen")}
                    className="inline-flex items-center gap-1 font-medium"
                  >
                    Last Seen
                    <SortIcon field="lastSeen" />
                  </button>
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.app_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_banned ? "destructive" : "success"}>
                      {user.is_banned ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {ts(user.created_at?._seconds)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {ts(user.last_seen?._seconds)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={getAdminAppHref(`/users/${user.id}`, selectedApp)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of{" "}
            {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              ← Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= data.total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
