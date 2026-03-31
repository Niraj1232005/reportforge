"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-app text-app antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-red-900 dark:bg-slate-950">
            <div className="inline-flex rounded-2xl bg-red-50 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              Global Recovery
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              ReportForge hit an unexpected error
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
              The app stopped this crash from cascading through the rest of the interface. Try
              reloading the experience below.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry App
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
