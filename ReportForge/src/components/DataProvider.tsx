"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        dedupingInterval: 15_000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
