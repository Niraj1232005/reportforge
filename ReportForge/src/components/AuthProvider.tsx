"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { useToast } from "@/components/ToastProvider";
import {
  loginWithEmail as loginWithEmailAction,
  loginWithGithub as loginWithGithubAction,
  loginWithGoogle as loginWithGoogleAction,
  logout as logoutAction,
  signupWithEmail as signupWithEmailAction,
} from "@/lib/auth";
import {
  clearBrowserSessionStorage,
  clearDraftCachesForLogin,
} from "@/lib/editor-storage";
import { sanitizeSafeRedirectPath } from "@/lib/sanitize";
import { supabase } from "@/lib/supabase";
import { getProfileForUser, updateProfileForUser } from "@/lib/user-data";
import type { UserProfile } from "@/types/editor";

type AuthMode = "login" | "signup";
type AuthPendingAction =
  | "google"
  | "github"
  | "email-login"
  | "email-signup"
  | null;

interface OpenLoginModalOptions {
  mode?: AuthMode;
  redirectTo?: string;
  title?: string;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  adminEmail: string | null;
  isAdmin: boolean;
  isGuestSession: boolean;
  openLoginModal: (options?: OpenLoginModalOptions) => void;
  closeLoginModal: () => void;
  requireAuth: (options?: OpenLoginModalOptions) => boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  refreshProfile: () => Promise<void>;
  saveProfile: (
    profile: Pick<UserProfile, "full_name" | "college_name" | "default_font">
  ) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

interface LoginModalState {
  open: boolean;
  mode: AuthMode;
  redirectTo: string | null;
  title: string;
  message: string;
}

const DEFAULT_MODAL_TITLE = "Login to ReportForge";
const DEFAULT_MODAL_MESSAGE =
  "Continue with Google, GitHub, or email. Guest mode is always available.";
const PENDING_AUTH_REDIRECT_KEY = "reportforge-auth-redirect";

const AuthContext = createContext<AuthContextValue | null>(null);

const readPendingRedirect = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_AUTH_REDIRECT_KEY);
  return sanitizeSafeRedirectPath(raw, "/templates");
};

const writePendingRedirect = (value: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.sessionStorage.removeItem(PENDING_AUTH_REDIRECT_KEY);
    return;
  }

  window.sessionStorage.setItem(
    PENDING_AUTH_REDIRECT_KEY,
    sanitizeSafeRedirectPath(value, "/templates")
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuestSession, setIsGuestSession] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AuthPendingAction>(null);
  const [modalState, setModalState] = useState<LoginModalState>({
    open: false,
    mode: "login",
    redirectTo: null,
    title: DEFAULT_MODAL_TITLE,
    message: DEFAULT_MODAL_MESSAGE,
  });
  const lastUserIdRef = useRef<string | null>(null);

  const adminEmail =
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase() || null;
  const isAdmin = Boolean(
    user?.email && adminEmail && user.email.toLowerCase() === adminEmail
  );

  const closeLoginModal = useCallback(() => {
    setAuthError(null);
    setPendingAction(null);
    setModalState((current) => ({ ...current, open: false }));
  }, []);

  const openLoginModal = useCallback(
    (options?: OpenLoginModalOptions) => {
      setAuthError(null);
      setModalState((current) => ({
        open: true,
        mode: options?.mode ?? current.mode,
        redirectTo: sanitizeSafeRedirectPath(
          options?.redirectTo ?? current.redirectTo ?? pathname,
          "/templates"
        ),
        title: options?.title ?? DEFAULT_MODAL_TITLE,
        message: options?.message ?? DEFAULT_MODAL_MESSAGE,
      }));
    },
    [pathname]
  );

  const requireAuth = useCallback(
    (options?: OpenLoginModalOptions) => {
      if (user) {
        return true;
      }

      openLoginModal(options);
      return false;
    },
    [openLoginModal, user]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await getProfileForUser(user);
    setProfile(nextProfile);
  }, [user]);

  const saveProfile = useCallback<
    AuthContextValue["saveProfile"]
  >(
    async (nextProfile) => {
      if (!user) {
        throw new Error("Sign in to update your profile.");
      }

      const saved = await updateProfileForUser(user.id, nextProfile);
      setProfile(saved);
      return saved;
    },
    [user]
  );

  const finalizeSignedInState = useCallback(
    (nextUser: User | null) => {
      setUser(nextUser);
      setLoading(false);

      if (!nextUser) {
        setProfile(null);
        setPendingAction(null);
        lastUserIdRef.current = null;
        return;
      }

      setIsGuestSession(false);
      setAuthError(null);
      setPendingAction(null);
      setModalState((current) => ({ ...current, open: false }));

      if (lastUserIdRef.current !== nextUser.id) {
        clearDraftCachesForLogin(nextUser.id);
        lastUserIdRef.current = nextUser.id;
      }

      void getProfileForUser(nextUser)
        .then((nextProfile) => {
          setProfile(nextProfile);
        })
        .catch((error: unknown) => {
          showToast({
            title: "Profile unavailable",
            description:
              error instanceof Error
                ? error.message
                : "Unable to load your profile settings.",
            variant: "error",
          });
        });

      const redirectTo = readPendingRedirect();
      writePendingRedirect(null);
      const safeRedirect =
        redirectTo && redirectTo !== "/auth/callback" ? redirectTo : "/templates";

      if (pathname === "/auth/callback" || safeRedirect !== pathname) {
        router.replace(safeRedirect);
      }
    },
    [pathname, router, showToast]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          showToast({
            title: "Session unavailable",
            description: error.message,
            variant: "error",
          });
          setLoading(false);
          return;
        }

        finalizeSignedInState(data.session?.user ?? null);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        showToast({
          title: "Session unavailable",
          description:
            error instanceof Error
              ? error.message
              : "Unable to restore the session.",
          variant: "error",
        });
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      finalizeSignedInState(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [finalizeSignedInState, showToast]);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    setPendingAction("google");
    writePendingRedirect(modalState.redirectTo ?? pathname);

    try {
      await loginWithGoogleAction();
    } catch (error) {
      writePendingRedirect(null);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.";
      setAuthError(message);
      setPendingAction(null);
      showToast({
        title: "Google login failed",
        description: message,
        variant: "error",
      });
    }
  }, [modalState.redirectTo, pathname, showToast]);

  const loginWithGithub = useCallback(async () => {
    setAuthError(null);
    setPendingAction("github");
    writePendingRedirect(modalState.redirectTo ?? pathname);

    try {
      await loginWithGithubAction();
    } catch (error) {
      writePendingRedirect(null);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to continue with GitHub.";
      setAuthError(message);
      setPendingAction(null);
      showToast({
        title: "GitHub login failed",
        description: message,
        variant: "error",
      });
    }
  }, [modalState.redirectTo, pathname, showToast]);

  const signupWithEmail = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      setPendingAction("email-signup");
      writePendingRedirect(modalState.redirectTo ?? pathname);

      try {
        const result = await signupWithEmailAction(email, password);

        if (!result.session) {
          writePendingRedirect(null);
          setModalState((current) => ({ ...current, mode: "login" }));
          showToast({
            title: "Account created",
            description: "Check your inbox to verify your email, then log in.",
            variant: "success",
          });
        } else {
          showToast({
            title: "Account ready",
            description: "Your account has been created and you are now signed in.",
            variant: "success",
          });
        }
      } catch (error) {
        writePendingRedirect(null);
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create the account.";
        setAuthError(message);
        showToast({
          title: "Signup failed",
          description: message,
          variant: "error",
        });
      } finally {
        setPendingAction(null);
      }
    },
    [modalState.redirectTo, pathname, showToast]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      setPendingAction("email-login");
      writePendingRedirect(modalState.redirectTo ?? pathname);

      try {
        await loginWithEmailAction(email, password);
        showToast({
          title: "Signed in",
          description: "Welcome back to ReportForge.",
          variant: "success",
        });
      } catch (error) {
        writePendingRedirect(null);
        const message =
          error instanceof Error ? error.message : "Unable to sign in.";
        setAuthError(message);
        showToast({
          title: "Login failed",
          description: message,
          variant: "error",
        });
      } finally {
        setPendingAction(null);
      }
    },
    [modalState.redirectTo, pathname, showToast]
  );

  const continueAsGuest = useCallback(() => {
    writePendingRedirect(null);
    setAuthError(null);
    setPendingAction(null);
    setIsGuestSession(true);
    setModalState((current) => ({ ...current, open: false }));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAction();
      clearBrowserSessionStorage();
      setIsGuestSession(false);
      writePendingRedirect(null);
      showToast({
        title: "Signed out",
        description: "Your session and local cache have been cleared.",
        variant: "info",
      });

      if (pathname.startsWith("/editor/") || pathname.startsWith("/admin")) {
        router.replace("/templates");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out.";
      showToast({
        title: "Logout failed",
        description: message,
        variant: "error",
      });
    }
  }, [pathname, router, showToast]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      adminEmail,
      isAdmin,
      isGuestSession,
      openLoginModal,
      closeLoginModal,
      requireAuth,
      loginWithGoogle,
      loginWithGithub,
      signupWithEmail,
      loginWithEmail,
      continueAsGuest,
      refreshProfile,
      saveProfile,
      logout,
    }),
    [
      adminEmail,
      closeLoginModal,
      continueAsGuest,
      isAdmin,
      isGuestSession,
      loading,
      loginWithEmail,
      loginWithGithub,
      loginWithGoogle,
      logout,
      openLoginModal,
      profile,
      refreshProfile,
      requireAuth,
      saveProfile,
      signupWithEmail,
      user,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AuthModal
        open={modalState.open}
        mode={modalState.mode}
        title={modalState.title}
        message={modalState.message}
        pendingAction={pendingAction}
        error={authError}
        onClose={closeLoginModal}
        onModeChange={(mode) => {
          setAuthError(null);
          setModalState((current) => ({ ...current, mode }));
        }}
        onGoogle={loginWithGoogle}
        onGithub={loginWithGithub}
        onEmailSubmit={(mode, email, password) =>
          mode === "signup"
            ? signupWithEmail(email, password)
            : loginWithEmail(email, password)
        }
        onContinueAsGuest={continueAsGuest}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};
