"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Reads `?app=` from URL search params and provides a setter that preserves
 * other query params. Survives refresh and is shareable.
 */
export function useSelectedApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedApp = searchParams.get("app") || "all";

  const setSelectedApp = useCallback(
    (app: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (app === "all") {
        params.delete("app");
      } else {
        params.set("app", app);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return { selectedApp, setSelectedApp } as const;
}
