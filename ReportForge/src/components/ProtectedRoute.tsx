"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  loginTitle?: string;
  loginMessage?: string;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  loginTitle = "Login to continue",
  loginMessage = "Continue with Google, GitHub, email, or the instant demo account.",
}: ProtectedRouteProps) {
  const pathname = usePathname();
  const { adminEmail, isAdmin, loading, openLoginModal, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      openLoginModal({
        redirectTo: pathname,
        title: loginTitle,
        message: loginMessage,
      });
    }
  }, [loading, loginMessage, loginTitle, openLoginModal, pathname, user]);

  if (loading) {
    return (
      <main className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          Checking your session...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Sign in required
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{loginMessage}</p>
          <button
            type="button"
            onClick={() =>
              openLoginModal({
                redirectTo: pathname,
                title: loginTitle,
                message: loginMessage,
              })
            }
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open Login
          </button>
        </div>
      </main>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <main className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <div className="inline-flex rounded-2xl bg-white/80 p-3 text-amber-700 dark:bg-slate-950/60 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-amber-950 dark:text-amber-100">
            Admin access only
          </h1>
          <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
            {adminEmail
              ? `Signed in as ${user.email}. Only ${adminEmail} can access this page.`
              : "Admin access is not configured yet. Set NEXT_PUBLIC_ADMIN_EMAIL to unlock this area."}
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
