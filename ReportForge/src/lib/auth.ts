import type {
  AuthResponse,
  OAuthResponse,
  Session,
} from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const DEMO_EMAIL = "demo@reportforge.app";
export const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Demo Recruiter";

const isAuthErrorMessage = (message: string, candidates: string[]) => {
  const normalizedMessage = message.toLowerCase();
  return candidates.some((candidate) => normalizedMessage.includes(candidate));
};

const toError = (error: unknown, fallbackMessage: string) => {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;

  if (isAuthErrorMessage(rawMessage, ["invalid login credentials", "invalid credentials"])) {
    return new Error("Invalid email or password.");
  }

  if (isAuthErrorMessage(rawMessage, ["email not confirmed"])) {
    return new Error("Check your inbox to confirm your email before logging in.");
  }

  if (isAuthErrorMessage(rawMessage, ["already registered", "user already registered"])) {
    return new Error("This email is already registered. Try logging in instead.");
  }

  if (isAuthErrorMessage(rawMessage, ["fetch failed", "network", "failed to fetch"])) {
    return new Error("Network error. Check your connection and try again.");
  }

  return new Error(rawMessage || fallbackMessage);
};

const ensureSupabaseClient = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase authentication is not configured.");
  }

  return supabase;
};

const getBrowserOrigin = () => {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "";
};

const buildRedirectUrl = (path: string) => {
  const origin = getBrowserOrigin();

  if (!origin) {
    return undefined;
  }

  return new URL(path, origin).toString();
};

const executeOAuthLogin = async (
  provider: "google" | "github",
  redirectTo = "/templates"
): Promise<OAuthResponse["data"]> => {
  const client = ensureSupabaseClient();
  const oauthRedirectUrl = buildRedirectUrl(redirectTo);
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthRedirectUrl,
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "consent",
            }
          : undefined,
    },
  });

  if (error) {
    throw toError(error, `Unable to continue with ${provider}.`);
  }

  return data;
};

const ensureDemoUserOnBackend = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim().replace(/\/$/, "");
  if (!backendBaseUrl) {
    return false;
  }

  try {
    const response = await fetch(`${backendBaseUrl}/auth/demo-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 503) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to prepare the demo account.");
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }

    throw error;
  }
};

const signInWithDemoCredentials = async (): Promise<AuthResponse["data"]> => {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    throw error;
  }

  return data;
};

const signUpDemoClientSide = async () => {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signUp({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    options: {
      emailRedirectTo: buildRedirectUrl("/templates"),
      data: {
        full_name: DEMO_NAME,
        is_demo: true,
      },
    },
  });

  if (
    error &&
    !isAuthErrorMessage(error.message, ["already registered", "user already registered"])
  ) {
    throw error;
  }
};

export const loginWithGoogle = async (redirectTo = "/templates") => {
  return executeOAuthLogin("google", redirectTo);
};

export const loginWithGithub = async (redirectTo = "/templates") => {
  return executeOAuthLogin("github", redirectTo);
};

export const signupWithEmail = async (email: string, password: string) => {
  const client = ensureSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: buildRedirectUrl("/templates"),
      data: {
        full_name: normalizedEmail.split("@")[0] || "ReportForge User",
      },
    },
  });

  if (error) {
    throw toError(error, "Unable to create the account.");
  }

  return data;
};

export const loginWithEmail = async (email: string, password: string) => {
  const client = ensureSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw toError(error, "Unable to sign in.");
  }

  return data;
};

export const loginWithDemo = async (): Promise<Session | null> => {
  try {
    const existingDemo = await signInWithDemoCredentials();
    return existingDemo.session;
  } catch (initialError) {
    const backendProvisioned = await ensureDemoUserOnBackend();

    if (!backendProvisioned) {
      await signUpDemoClientSide();
    }

    try {
      const retry = await signInWithDemoCredentials();
      return retry.session;
    } catch (retryError) {
      if (
        retryError instanceof Error &&
        isAuthErrorMessage(retryError.message, ["email not confirmed"])
      ) {
        throw new Error(
          "Demo login needs an auto-confirmed demo user. Configure SUPABASE_SERVICE_ROLE_KEY on the backend to make demo access instant."
        );
      }

      throw toError(
        retryError,
        initialError instanceof Error
          ? initialError.message
          : "Unable to log into the demo account."
      );
    }
  }
};

export const logout = async () => {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw toError(error, "Unable to sign out.");
  }
};
