"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, LogIn } from "lucide-react";
import Link from "next/link";
import { TemplateGridSkeleton } from "@/components/PageSkeletons";
import StatePanel from "@/components/StatePanel";
import TemplateCard from "@/components/TemplateCard";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { useTemplates } from "@/hooks/useTemplates";
import {
  DASHBOARD_ROUTE,
  DEFAULT_POST_LOGIN_REDIRECT,
  HOME_ROUTE,
} from "@/lib/routes";

export default function TemplatesPage() {
  const { loading, openLoginModal, user } = useAuth();
  const { showToast } = useToast();
  const { error, isLoading, mutate, templates } = useTemplates();
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    const message = error instanceof Error ? error.message : error ? "Unable to load templates." : null;
    if (!message) {
      lastErrorRef.current = null;
      return;
    }

    if (lastErrorRef.current === message) {
      return;
    }

    lastErrorRef.current = message;
    showToast({
      title: "Template library unavailable",
      description: message,
      variant: "error",
      actionLabel: "Retry",
      onAction: () => {
        void mutate();
      },
    });
  }, [error, mutate, showToast]);

  return (
    <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Template Gallery
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl dark:text-slate-100">
                Pick a template, then open the editor with the right structure already in place.
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                ReportForge keeps templates, editing, autosave history, and profile settings in
                separate spaces so the product feels predictable instead of crowded.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {user ? (
                <Link
                  href={DASHBOARD_ROUTE}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Open Dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openLoginModal({
                      mode: "login",
                      redirectTo: DEFAULT_POST_LOGIN_REDIRECT,
                      title: "Login to sync your reports",
                      message:
                        "Sign in to unlock dashboard history, cloud autosave, and profile defaults.",
                    })
                  }
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  {loading ? "Loading..." : "Login"}
                </button>
              )}
            </div>
          </div>
        </motion.section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">
                Templates open the editor directly
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-blue-100">
                Choose a template below and we&apos;ll route you to its editor immediately. Guest
                editing still works, and signing in later keeps your current workspace.
              </p>
            </div>
            {user ? (
              <Link
                href={DASHBOARD_ROUTE}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
              >
                View recent reports
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </section>

        {isLoading ? (
          <TemplateGridSkeleton />
        ) : null}

        {error ? (
          <StatePanel
            tone="error"
            eyebrow="Template Library"
            title="We couldn't load templates right now"
            description={
              error instanceof Error ? error.message : "Unable to load templates right now."
            }
            actionLabel="Retry"
            onAction={() => {
              void mutate();
            }}
          />
        ) : null}

        {!isLoading && !templates.length ? (
          <StatePanel
            eyebrow="Template Library"
            title="No templates available yet"
            description="The library is ready for your first production template set. You can return home or retry the current feed."
            actionLabel="Back to Home"
            actionHref={HOME_ROUTE}
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.04 }}
            >
              <TemplateCard template={template} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
