"use client";

import { motion } from "framer-motion";
import { Clock3, History, LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import TemplateCard from "@/components/TemplateCard";
import { useToast } from "@/components/ToastProvider";
import { DEFAULT_FONT_LIBRARY } from "@/lib/document-settings";
import { fetchTemplatesFromSource } from "@/lib/template-service";
import { listReportsForUser } from "@/lib/user-data";
import type { ReportRecord, ReportTemplate } from "@/types/editor";

export default function TemplatesPage() {
  const { openLoginModal, profile, saveProfile, user } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    college_name: "",
    default_font: DEFAULT_FONT_LIBRARY[0],
  });

  useEffect(() => {
    let cancelled = false;

    const loadTemplates = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const rows = await fetchTemplatesFromSource();
        if (!cancelled) {
          setTemplates(rows);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load templates";
          setLoadError(message);
          showToast({
            title: "Template loading failed",
            description: message,
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name ?? "",
      college_name: profile?.college_name ?? "",
      default_font: profile?.default_font ?? DEFAULT_FONT_LIBRARY[0],
    });
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      if (!user?.id) {
        setReports([]);
        return;
      }

      setIsLoadingReports(true);
      try {
        const rows = await listReportsForUser(user.id);
        if (!cancelled) {
          setReports(rows);
        }
      } catch (error) {
        if (!cancelled) {
          showToast({
            title: "History unavailable",
            description:
              error instanceof Error
                ? error.message
                : "Unable to load your saved reports.",
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReports(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [showToast, user?.id]);

  return (
    <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Template Library
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold text-slate-900 md:text-5xl dark:text-slate-100">
                Choose a polished starting point
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                Start with a clean structure, then refine the document in the editor with live A4
                preview, print-perfect output, and export-ready formatting.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!user ? (
                <button
                  type="button"
                  onClick={() =>
                    openLoginModal({
                      mode: "login",
                      redirectTo: "/templates",
                      title: "Login to save and sync reports",
                      message:
                        "Guest editing is available, but login unlocks history, profile autofill, and cloud autosave.",
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              ) : null}
              <Link
                href="/editor/research-report"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {user ? "Open Editor" : "Continue as Guest"}
              </Link>
            </div>
          </div>
        </motion.header>

        {user ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                    Dashboard
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Recent Reports
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {isLoadingReports ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Loading your report history...
                  </div>
                ) : reports.length ? (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {report.title}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Clock3 className="h-3.5 w-3.5" />
                            Updated {new Date(report.updated_at).toLocaleString()}
                          </p>
                        </div>
                        <Link
                          href={`/editor/${report.content.templateId || "research-report"}?reportId=${report.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                        >
                          Open Report
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Your autosaved reports will appear here after you start editing.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                    Profile
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Default Settings
                  </h2>
                </div>
              </div>

              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setIsSavingProfile(true);
                  void saveProfile(profileForm)
                    .then(() => {
                      showToast({
                        title: "Profile updated",
                        description: "Your editor defaults have been saved.",
                        variant: "success",
                      });
                    })
                    .catch((error: unknown) => {
                      showToast({
                        title: "Profile update failed",
                        description:
                          error instanceof Error
                            ? error.message
                            : "Unable to save your profile.",
                        variant: "error",
                      });
                    })
                    .finally(() => {
                      setIsSavingProfile(false);
                    });
                }}
              >
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Full name
                  </span>
                  <input
                    value={profileForm.full_name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    College name
                  </span>
                  <input
                    value={profileForm.college_name}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        college_name: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Default font
                  </span>
                  <select
                    value={profileForm.default_font}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        default_font: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                  >
                    {DEFAULT_FONT_LIBRARY.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                >
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900 dark:bg-blue-950/30">
            <h2 className="text-xl font-semibold text-blue-950 dark:text-blue-100">
              Guest editing is fully available
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-blue-900 dark:text-blue-100">
              You can create, edit, preview, print, and export without logging in. Sign in only if
              you want cloud autosave, report history, and profile autofill.
            </p>
          </section>
        )}

        {isLoading ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`template-skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="animate-pulse space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-8 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-5/6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !templates.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            No templates found.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.05 }}
            >
              <TemplateCard template={template} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
