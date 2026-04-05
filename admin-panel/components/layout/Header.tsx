"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, ChevronDown } from "lucide-react";
import AppSelector from "@/components/layout/AppSelector";
import { useFirestore } from "@/hooks/useFirestore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  selectedApp: string;
  onAppChange: (value: string) => void;
}

interface AppsResponse {
  apps: Array<{ id: string; app_name: string }>;
}

export default function Header({ selectedApp, onAppChange }: HeaderProps) {
  const { data: session } = useSession();
  const { data } = useFirestore<AppsResponse>("/api/admin/apps");

  const apps = (data?.apps || []).map((a) => ({
    id: a.id,
    label: a.app_name,
  }));

  const email = session?.user?.email || "";
  const name = email.split("@")[0] || "User";
  const initial = email[0]?.toUpperCase() || "?";
  const role = session?.user?.role || "viewer";

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 px-4 py-2.5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-[200px]">
          <AppSelector value={selectedApp} onChange={onAppChange} apps={apps} />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-none">{name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {role}
                  </p>
                </div>
                <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{name}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <Badge variant={role === "owner" ? "warning" : "secondary"}>
                  {role}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
