"use client";

import { useSession } from "next-auth/react";

export function useAdminAuth() {
  const { data: session, status } = useSession();

  return {
    status,
    role: session?.user?.role || null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    canWrite:
      session?.user?.role === "owner" || session?.user?.role === "admin",
    isOwner: session?.user?.role === "owner",
  };
}
