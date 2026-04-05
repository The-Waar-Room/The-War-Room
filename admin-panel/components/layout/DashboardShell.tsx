"use client";

import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSelectedApp } from "@/hooks/useSelectedApp";

function ShellInner({ children }: { children: React.ReactNode }) {
  const { selectedApp, setSelectedApp } = useSelectedApp();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/40">
        <div className="flex pb-16 md:pb-0">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <Header selectedApp={selectedApp} onAppChange={setSelectedApp} />
            <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
