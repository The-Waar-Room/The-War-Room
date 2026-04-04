"use client";

import useSWR from "swr";

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json() as Promise<T>;
};

export function useFirestore<T>(key: string | null, refreshInterval = 0) {
  return useSWR<T>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
}
