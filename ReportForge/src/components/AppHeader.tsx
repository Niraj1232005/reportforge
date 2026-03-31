"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useLastEditorPath } from "@/hooks/useLastEditorPath";
import {
  ABOUT_ROUTE,
  DEFAULT_POST_LOGIN_REDIRECT,
  HOME_ROUTE,
  isEditorRoute,
  PROFILE_ROUTE,
  DASHBOARD_ROUTE,
  TEMPLATES_ROUTE,
} from "@/lib/routes";

const getUserDisplayName = (email: string | undefined | null, fullName: unknown) => {
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return email.split("@")[0] || "ReportForge User";
  }

  return "ReportForge User";
};

const getUserInitials = (label: string) => {
  const parts = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "RF";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

const isActiveLink = (pathname: string, href: string) => {
  if (href === ABOUT_ROUTE) {
    return pathname === HOME_ROUTE;
  }

  if (href === HOME_ROUTE) {
    return pathname === HOME_ROUTE;
  }

  if (href === TEMPLATES_ROUTE) {
    return pathname.startsWith(TEMPLATES_ROUTE);
  }

  if (href === DASHBOARD_ROUTE) {
    return pathname.startsWith(DASHBOARD_ROUTE);
  }

  if (href === PROFILE_ROUTE) {
    return pathname.startsWith(PROFILE_ROUTE);
  }

  if (href.startsWith("/editor/")) {
    return isEditorRoute(pathname);
  }

  return pathname === href;
};

export default function AppHeader() {
  const pathname = usePathname();
  const { isDark, toggleTheme, mounted } = useTheme();
  const { loading, logout, openLoginModal, profile, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const lastEditorPath = useLastEditorPath(pathname, user?.id);

  const editorHref = lastEditorPath ?? TEMPLATES_ROUTE;

  const navLinks = useMemo(
    () => [
      { label: "Home", href: HOME_ROUTE },
      { label: "Templates", href: TEMPLATES_ROUTE },
      { label: "Editor", href: editorHref },
      { label: "About", href: ABOUT_ROUTE },
    ],
    [editorHref]
  );
  const closeMenus = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  const userDisplayName = getUserDisplayName(
    user?.email,
    profile?.full_name || user?.user_metadata?.full_name
  );
  const userInitials = getUserInitials(userDisplayName);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/82 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/78">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href={HOME_ROUTE} onClick={closeMenus} className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-slate-950">
            RF
          </span>
          <div>
            <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              ReportForge
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              SaaS report workspace
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-xl border border-slate-200/80 bg-white/85 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:flex">
          {navLinks.map((link) => {
            const active = isActiveLink(pathname, link.href);

            return (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenus}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
                  active
                    ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={
              mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"
            }
          >
            {mounted ? (
              isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" aria-hidden />
            )}
          </button>

          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 text-xs font-semibold text-white shadow-sm">
                  {userInitials}
                </span>
                <span className="max-w-36 truncate">{userDisplayName}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-12 w-60 rounded-2xl border border-slate-200 bg-white/96 p-2 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/96"
                  >
                    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-sm font-semibold text-white shadow-sm">
                          {userInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {userDisplayName}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Secure session active
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      <Link
                        href={DASHBOARD_ROUTE}
                        onClick={closeMenus}
                        className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href={PROFILE_ROUTE}
                        onClick={closeMenus}
                        className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          closeMenus();
                          void logout();
                        }}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition duration-200 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        Logout
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                closeMenus();
                openLoginModal({
                  mode: "login",
                  redirectTo: DEFAULT_POST_LOGIN_REDIRECT,
                });
              }}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={
              mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"
            }
          >
            {mounted ? (
              isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )
            ) : (
              <span className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition duration-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 pb-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
          <div className="space-y-1 pt-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMenus}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ${
                  isActiveLink(pathname, link.href)
                    ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-sm font-semibold text-white shadow-sm">
                    {userInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {userDisplayName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Link
                    href={DASHBOARD_ROUTE}
                    onClick={closeMenus}
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={PROFILE_ROUTE}
                    onClick={closeMenus}
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenus();
                      void logout();
                    }}
                    className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  openLoginModal({
                    mode: "login",
                  redirectTo: DEFAULT_POST_LOGIN_REDIRECT,
                });
              }}
              disabled={loading}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? "Loading..." : "Login"}
            </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
