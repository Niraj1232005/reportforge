"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, FilePlus2, FileText } from "lucide-react";
import Link from "next/link";
import { DashboardListSkeleton } from "@/components/PageSkeletons";
import ProtectedRoute from "@/components/ProtectedRoute";
import StatePanel from "@/components/StatePanel";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useUserReports } from "@/hooks/useUserReports";
import {
  buildEditorRoute,
  FALLBACK_TEMPLATE_ID,
  PROFILE_ROUTE,
  TEMPLATES_ROUTE,
} from "@/lib/routes";

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const { error, isLoading, mutate, reports } = useUserReports(user?.id);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    const message = error instanceof Error ? error.message : error ? "Unable to load your reports." : null;
    if (!message) {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === message) {
      return;
    }

    lastErrorRef.current = message;
    showToast({
      title: "Dashboard unavailable",
      description: message,
      variant: "error",
      actionLabel: "Retry",
      onAction: () => {
        void mutate();
      },
    });
  }, [error, mutate, showToast]);

  return (
    <ProtectedRoute
      loginTitle="Login to view your dashboard"
      loginMessage="Sign in to access your saved report history and open recent work."
    >
      <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Dashboard
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl dark:text-slate-100">
                  {profile?.full_name
                    ? `${profile.full_name}, here's your recent work.`
                    : "Your recent reports."}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                  Autosaved reports are scoped to your account and sorted by the latest update, so
                  reopening work feels reliable instead of guessy.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={TEMPLATES_ROUTE}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Start New Report
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={PROFILE_ROUTE}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Profile Settings
                </Link>
              </div>
            </div>
          </motion.section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Report History
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Recent Reports
                </h2>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-6">
                <DashboardListSkeleton />
              </div>
            ) : null}

            {error ? (
              <div className="mt-6">
                <StatePanel
                  tone="error"
                  eyebrow="Report History"
                  title="We couldn't load your saved reports"
                  description={
                    error instanceof Error ? error.message : "Unable to load your reports."
                  }
                  actionLabel="Retry"
                  onAction={() => {
                    void mutate();
                  }}
                />
              </div>
            ) : null}

            {!isLoading && !reports.length ? (
              <div className="mt-6">
                <StatePanel
                  eyebrow="Report History"
                  title="No reports yet"
                  description="Create your first report and we'll autosave it here every few seconds while you work."
                  icon={<FilePlus2 className="h-5 w-5" />}
                  actionLabel="Create your first report"
                  actionHref={TEMPLATES_ROUTE}
                />
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-100">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                            {report.title}
                          </h3>
                          <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Clock3 className="h-4 w-4" />
                            Updated {formatTimestamp(report.updated_at)}
                          </p>
                          {report.is_optimistic ? (
                            <p className="mt-2 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              Syncing latest changes...
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={buildEditorRoute(
                        report.content.templateId || FALLBACK_TEMPLATE_ID,
                        report.id
                      )}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                    >
                      Open
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
