"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const { data: session } = useSession();

  const email = session?.user?.email || "";
  const name = email.split("@")[0] || "User";
  const initial = email[0]?.toUpperCase() || "?";
  const role = session?.user?.role || "viewer";

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-3 rounded-2xl border bg-background/80 px-3 py-2 shadow-sm">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-none">{name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {email}
            </p>
          </div>
          <Badge variant={role === "owner" ? "warning" : "secondary"}>
            {role}
          </Badge>
        </div>
      </div>
    </header>
  );
}
