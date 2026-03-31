"use client";

import { useMemo } from "react";
import { readLastEditorPath } from "@/lib/editor-storage";
import { isEditorRoute } from "@/lib/routes";

export const useLastEditorPath = (
  pathname: string,
  userId?: string | null
) => {
  return useMemo(() => {
    if (isEditorRoute(pathname)) {
      if (typeof window === "undefined") {
        return pathname;
      }

      return `${pathname}${window.location.search}`;
    }

    return readLastEditorPath(userId);
  }, [pathname, userId]);
};
