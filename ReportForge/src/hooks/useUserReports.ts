"use client";

import { mutate } from "swr";
import useSWR from "swr";
import { listReportsForUser } from "@/lib/user-data";
import type { ReportRecord } from "@/types/editor";

export const getUserReportsCacheKey = (userId: string) => `reports:${userId}`;

export const mutateUserReports = (
  userId: string,
  nextValue?:
    | ReportRecord[]
    | Promise<ReportRecord[]>
    | ((current?: ReportRecord[]) => ReportRecord[] | Promise<ReportRecord[]>)
    | undefined,
  revalidate = nextValue === undefined
) => mutate(getUserReportsCacheKey(userId), nextValue, { revalidate });

export const useUserReports = (userId: string | null | undefined) => {
  const query = useSWR(
    userId ? getUserReportsCacheKey(userId) : null,
    () => listReportsForUser(userId as string),
    {
      dedupingInterval: 10_000,
      shouldRetryOnError: true,
      errorRetryCount: 1,
      errorRetryInterval: 1_500,
    }
  );

  return {
    ...query,
    reports: query.data ?? [],
  };
};
