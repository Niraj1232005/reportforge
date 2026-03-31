"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeOAuthCodeForSession, getCurrentSession } from "@/lib/auth";
import {
  DEFAULT_POST_LOGIN_REDIRECT,
  HOME_ROUTE,
} from "@/lib/routes";
import { sanitizeSafeRedirectPath } from "@/lib/sanitize";

const readPendingRedirect = () => {
  if (typeof window === "undefined") {
    return DEFAULT_POST_LOGIN_REDIRECT;
  }

  return sanitizeSafeRedirectPath(
    window.sessionStorage.getItem("reportforge-auth-redirect"),
    DEFAULT_POST_LOGIN_REDIRECT
  );
};

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const oauthError = useMemo(() => {
    return (
      searchParams.get("error_description") ||
      searchParams.get("error") ||
      null
    );
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      if (oauthError) {
        if (!cancelled) {
          setErrorMessage(oauthError);
        }
        return;
      }

      try {
        const code = searchParams.get("code");

        if (code) {
          await exchangeOAuthCodeForSession(code);
        }

        const { session } = await getCurrentSession();
        if (!session?.user) {
          throw new Error("No active session was returned from the sign-in flow.");
        }

        if (!cancelled) {
          router.replace(readPendingRedirect());
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to complete sign-in."
          );
        }
      }
    };

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [oauthError, router, searchParams]);

  if (errorMessage) {
    return (
      <main className="px-4 py-12 md:px-6">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-red-200 bg-white p-8 shadow-sm dark:border-red-900 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
            Authentication Error
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            We could not complete the sign-in flow
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
            {errorMessage}
          </p>
          <Link
            href={HOME_ROUTE}
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-12 md:px-6">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          <LoaderCircle className="h-5 w-5 animate-spin" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          Finishing Sign-In
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Restoring your session
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
          We&apos;re verifying your account and sending you back to ReportForge.
        </p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-12 md:px-6">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Preparing secure sign-in...
            </p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
