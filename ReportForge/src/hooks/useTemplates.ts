"use client";

import useSWR from "swr";
import { fetchTemplatesFromSource } from "@/lib/template-service";

export const TEMPLATES_CACHE_KEY = "templates";

export const useTemplates = () => {
  const query = useSWR(TEMPLATES_CACHE_KEY, fetchTemplatesFromSource, {
    dedupingInterval: 60_000,
    shouldRetryOnError: true,
    errorRetryCount: 1,
    errorRetryInterval: 1_500,
  });

  return {
    ...query,
    templates: query.data ?? [],
  };
};
