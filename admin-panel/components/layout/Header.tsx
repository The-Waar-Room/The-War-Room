"use client";

import { signOut, useSession } from "next-auth/react";
import AppSelector from "@/components/layout/AppSelector";

interface HeaderProps {
  selectedApp: string;
  onAppChange: (value: string) => void;
}

const sampleApps = [
  { id: "descroll", label: "Study Scroller" },
  { id: "app2", label: "App 2" },
];

export default function Header({ selectedApp, onAppChange }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <AppSelector
            value={selectedApp}
            onChange={onAppChange}
            apps={sampleApps}
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-sm text-slate-600">
            {session?.user?.email || "Unknown"}
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs uppercase">
              {session?.user?.role || "viewer"}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
