"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  AppWindow,
  Users,
  CreditCard,
  Bot,
  Cloud,
  Settings,
  Bell,
  MessageSquare,
  LifeBuoy,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore } from "@/hooks/useFirestore";
import { useSelectedApp } from "@/hooks/useSelectedApp";
import AppSelector from "@/components/layout/AppSelector";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface AppsResponse {
  apps: Array<{ id: string; app_name: string }>;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/apps", label: "Apps", icon: AppWindow },
      { href: "/users", label: "Accounts", icon: Users },
      { href: "/support-messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/ai-usage", label: "AI Usage", icon: Bot },
      { href: "/cloud-usage", label: "Cloud Budget", icon: Cloud },
      { href: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/support-tickets", label: "Support Tickets", icon: LifeBuoy },
    ],
  },
  {
    title: "General",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const mobileItems: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/users", label: "Accounts", icon: Users },
  { href: "/support-messages", label: "Messages", icon: MessageSquare },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { selectedApp, setSelectedApp } = useSelectedApp();
  const { data } = useFirestore<AppsResponse>("/api/admin/apps", 60000);

  const apps = (data?.apps || []).map((app) => ({
    id: app.id,
    label: app.app_name,
  }));
  const name =
    selectedApp === "all"
      ? "All Products"
      : (apps.find((app) => app.id === selectedApp)?.label ??
        "Selected Product");
  const role = session?.user?.role || "admin";

  const withApp = (href: string) => {
    if (selectedApp === "all") {
      return href;
    }

    return `${href}?app=${encodeURIComponent(selectedApp)}`;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-[290px] shrink-0 border-r bg-background md:sticky md:top-0 md:flex md:flex-col">
        <div className="flex items-start gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
            W
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-base font-semibold tracking-tight">
                War Room
              </span>
              <Badge variant="secondary" className="text-[10px] uppercase">
                {role}
              </Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {name}
            </p>
          </div>
        </div>
        <Separator />
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active Product
          </p>
          <AppSelector
            value={selectedApp}
            onChange={setSelectedApp}
            apps={apps}
            allLabel="All Products"
            className="h-11 rounded-2xl border-0 bg-muted px-4 text-left shadow-none hover:bg-muted"
            contentClassName="w-[240px]"
          />
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-4">
              {navSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  {sectionIndex > 0 && <Separator className="mb-4" />}
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;

                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={withApp(item.href)}
                              className={cn(
                                "flex items-center gap-3 rounded-r-xl border-l-[3px] px-3 py-2.5 text-sm transition-colors",
                                active
                                  ? "border-primary bg-primary/10 font-medium text-primary"
                                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <Icon className="h-4.5 w-4.5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="md:hidden">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TooltipProvider>
        </nav>
        <div className="border-t px-3 py-3">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-r-xl border-l-[3px] border-transparent px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t bg-card px-1 py-1.5 md:hidden">
        {mobileItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={withApp(item.href)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[10px]",
                active ? "font-semibold text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
