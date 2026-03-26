"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Github,
  LoaderCircle,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

type AuthMode = "login" | "signup";
type AuthPendingAction =
  | "google"
  | "github"
  | "email-login"
  | "email-signup"
  | "demo"
  | null;

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  title: string;
  message: string;
  pendingAction: AuthPendingAction;
  error: string | null;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onGoogle: () => Promise<void>;
  onGithub: () => Promise<void>;
  onEmailSubmit: (mode: AuthMode, email: string, password: string) => Promise<void>;
  onDemo: () => Promise<void>;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.9 4.9 0 0 1-2 3.2v2.7h3.3c1.9-1.8 3-4.5 3-7.6Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.7-2.5l-3.3-2.7c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.8A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.7A6 6 0 0 1 6 12c0-.6.1-1.2.4-1.7V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.5l3.3-2.8Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 12 2 10 10 0 0 0 3.1 7.5l3.3 2.8c.8-2.4 3-4.1 5.6-4.1Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthModal({
  open,
  mode,
  title,
  message,
  pendingAction,
  error,
  onClose,
  onModeChange,
  onGoogle,
  onGithub,
  onEmailSubmit,
  onDemo,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isBusy = pendingAction !== null;
  const submitLabel = mode === "login" ? "Continue with Email" : "Create Account";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Secure Login
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close login dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void onGoogle()}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {pendingAction === "google" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => void onGithub()}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {pendingAction === "github" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Github className="h-4 w-4" />
                )}
                Continue with GitHub
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                or use email
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="mb-4 flex gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => onModeChange("login")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onModeChange("signup")}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void onEmailSubmit(mode, email, password);
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@reportforge.app"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === "login" ? "Enter your password" : "Create a password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pendingAction === "email-login" || pendingAction === "email-signup" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {submitLabel}
              </button>
            </form>

            <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Recruiter Demo
                  </p>
                  <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
                    Instant access with the shared demo account. No email verification required.
                  </p>
                </div>
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
              </div>
              <button
                type="button"
                onClick={() => void onDemo()}
                disabled={isBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pendingAction === "demo" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Try Demo
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
