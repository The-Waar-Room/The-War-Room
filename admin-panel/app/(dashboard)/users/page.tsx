"use client";

import { useState } from "react";
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
import type { UserInfo } from "@/lib/firestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import Link from "next/link";

const PAGE_SIZE = 25;

function ts(seconds?: number) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UsersPage() {
  const { selectedApp } = useSelectedApp();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");

  const appParam = selectedApp !== "all" ? `&app=${selectedApp}` : "";
  const { data, isLoading, error } = useFirestore<{
    users: UserInfo[];
    total: number;
  }>(`/api/admin/users?limit=${PAGE_SIZE}&offset=${offset}${appParam}`, 30000);

  const filtered = data?.users?.filter(
    (u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.uid?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Users</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {data ? `${data.total} total users` : "Loading..."}
        </p>
      </div>

      <Input
        placeholder="Filter by email or UID…"
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
                <TableHead>Email</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Seen</TableHead>
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
                      href={`/users/${user.id}`}
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
