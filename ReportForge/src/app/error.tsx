"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import StatePanel from "@/components/StatePanel";
import { HOME_ROUTE } from "@/lib/routes";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-4 py-12 md:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <StatePanel
          tone="error"
          eyebrow="Runtime Recovery"
          title="Something went wrong in this view"
          description="The app caught the error safely, so your session is still intact. You can retry this screen or head back to the main workspace."
          icon={<AlertTriangle className="h-5 w-5" />}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href={HOME_ROUTE}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
