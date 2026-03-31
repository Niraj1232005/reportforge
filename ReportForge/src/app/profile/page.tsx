"use client";

import { useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { DEFAULT_FONT_LIBRARY } from "@/lib/document-settings";
import { DASHBOARD_ROUTE, TEMPLATES_ROUTE } from "@/lib/routes";

interface ProfileSettingsFormProps {
  initialFont: string;
  initialFullName: string;
  onSave: (payload: { default_font: string; full_name: string }) => Promise<void>;
}

function ProfileSettingsForm({
  initialFont,
  initialFullName,
  onSave,
}: ProfileSettingsFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [defaultFont, setDefaultFont] = useState(initialFont);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = fullName !== initialFullName || defaultFont !== initialFont;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setIsSaving(true);
        void onSave({
          full_name: fullName,
          default_font: defaultFont,
        }).finally(() => setIsSaving(false));
      }}
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Full Name
        </label>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your full name"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Default Font
        </label>
        <select
          value={defaultFont}
          onChange={(event) => setDefaultFont(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
        >
          {DEFAULT_FONT_LIBRARY.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSaving || !hasChanges}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { profile, saveProfile, user } = useAuth();
  const { showToast } = useToast();
  const metadataFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const initialFullName = profile?.full_name ?? metadataFullName;
  const initialFont = profile?.default_font ?? DEFAULT_FONT_LIBRARY[0];
  const formKey = `${profile?.updated_at ?? "profile"}:${initialFullName}:${initialFont}`;

  return (
    <ProtectedRoute
      loginTitle="Login to manage your profile"
      loginMessage="Sign in to edit your default ReportForge profile settings."
    >
      <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Profile
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl dark:text-slate-100">
                  Keep your personal defaults clean and reusable.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                  These settings flow into your account profile and are reused whenever you start a
                  new report.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={DASHBOARD_ROUTE}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Dashboard
                </Link>
                <Link
                  href={TEMPLATES_ROUTE}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  Browse Templates
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
              <ProfileSettingsForm
                key={formKey}
                initialFont={initialFont}
                initialFullName={initialFullName}
                onSave={async (payload) => {
                  try {
                    await saveProfile(payload);
                    showToast({
                      title: "Profile updated",
                      description: "Your default settings have been saved.",
                      variant: "success",
                    });
                  } catch (error) {
                    showToast({
                      title: "Profile update failed",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Unable to save your profile settings.",
                      variant: "error",
                    });
                    throw error;
                  }
                }}
              />

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Account
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {user?.email ?? "Signed-in account"}
                </h2>
                <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-950">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p>Your name can be reused as the default author identity in new reports.</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-950">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <p>Your font choice syncs to the Supabase profile table and follows your account.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
