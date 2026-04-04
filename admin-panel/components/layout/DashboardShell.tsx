"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedApp, setSelectedApp] = useState("all");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex pb-16 md:pb-0">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Header selectedApp={selectedApp} onAppChange={setSelectedApp} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
