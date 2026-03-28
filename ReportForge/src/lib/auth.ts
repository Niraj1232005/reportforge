import type { OAuthResponse, Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const OAUTH_CALLBACK_PATH = "/auth/callback";

const isAuthErrorMessage = (message: string, candidates: string[]) => {
  const normalizedMessage = message.toLowerCase();
  return candidates.some((candidate) => normalizedMessage.includes(candidate));
};

const toError = (error: unknown, fallbackMessage: string) => {
  const rawMessage = error instanceof Error ? error.message : fallbackMessage;

  if (
    isAuthErrorMessage(rawMessage, [
      "invalid login credentials",
      "invalid credentials",
    ])
  ) {
    return new Error("Invalid email or password.");
  }

  if (isAuthErrorMessage(rawMessage, ["email not confirmed"])) {
    return new Error("Check your inbox to confirm your email before logging in.");
  }

  if (
    isAuthErrorMessage(rawMessage, [
      "already registered",
      "user already registered",
    ])
  ) {
    return new Error("This email is already registered. Try logging in instead.");
  }

  if (
    isAuthErrorMessage(rawMessage, ["fetch failed", "network", "failed to fetch"])
  ) {
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

const buildOAuthRedirectUrl = () => {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  return siteUrl ? `${siteUrl}${OAUTH_CALLBACK_PATH}` : undefined;
};

const executeOAuthLogin = async (
  provider: "google" | "github"
): Promise<OAuthResponse["data"]> => {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildOAuthRedirectUrl(),
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

export const loginWithGoogle = async () => {
  return executeOAuthLogin("google");
};

export const loginWithGithub = async () => {
  return executeOAuthLogin("github");
};

export const signupWithEmail = async (email: string, password: string) => {
  const client = ensureSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: buildOAuthRedirectUrl(),
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

export const logout = async () => {
  const client = ensureSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw toError(error, "Unable to sign out.");
  }
};

export const exchangeOAuthCodeForSession = async (code: string) => {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    throw toError(error, "Unable to restore your session.");
  }

  return data;
};

export const getCurrentSession = async (): Promise<{
  session: Session | null;
  user: User | null;
}> => {
  const client = ensureSupabaseClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw toError(error, "Unable to restore your session.");
  }

  return {
    session: data.session,
    user: data.session?.user ?? null,
  };
};
