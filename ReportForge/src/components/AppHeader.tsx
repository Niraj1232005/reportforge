"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  LayoutDashboard,
  Menu,
  Moon,
  PenSquare,
  Sun,
  UserCircle2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

const templateMenuItems = [
  { id: "research-report", label: "Research Report" },
  { id: "lab-report", label: "Lab Report" },
  { id: "project-report", label: "Project Report" },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Templates", href: "/templates" },
  { label: "Editor", href: "/editor/research-report" },
  { label: "About", href: "/#about" },
];

const getUserDisplayName = (email: string | undefined | null, fullName: unknown) => {
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return email.split("@")[0] || "ReportForge User";
  }

  return "ReportForge User";
};

export default function AppHeader() {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const { isAdmin, loading, logout, openLoginModal, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const editorHref = useMemo(() => {
    if (pathname.startsWith("/editor/")) {
      return pathname;
    }

    return "/editor/research-report";
  }, [pathname]);

  const userDisplayName = getUserDisplayName(user?.email, user?.user_metadata?.full_name);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm">
            RF
          </span>
          <div>
            <span className="block text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              ReportForge
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              Structured reports, polished output
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex">
          {navLinks.map((link) =>
            link.label === "Templates" ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setTemplatesOpen(true)}
                onMouseLeave={() => setTemplatesOpen(false)}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Templates
                  <ChevronDown className="h-4 w-4" />
                </button>

                <AnimatePresence>
                  {templatesOpen ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="absolute left-0 top-12 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                    >
                      {templateMenuItems.map((template) => (
                        <Link
                          key={template.id}
                          href={`/editor/${template.id}`}
                          className="block rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          {template.label}
                        </Link>
                      ))}
                      <Link
                        href="/templates"
                        className="mt-1 block rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        View all templates
                      </Link>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.label === "Editor" ? editorHref : link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <UserCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{userDisplayName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {userMenuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-12 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {userDisplayName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    ) : null}
                    <Link
                      href={editorHref}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      <PenSquare className="h-4 w-4" />
                      Continue Editing
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      Logout
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                openLoginModal({
                  mode: "login",
                  redirectTo: pathname,
                })
              }
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          )}

          <Link
            href="/templates"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PenSquare className="h-4 w-4" />
            Create Report
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 px-4 pb-4 dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
          >
            <div className="space-y-1 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.label === "Editor" ? editorHref : link.href}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {userDisplayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  <div className="mt-3 flex gap-2">
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Admin Panel
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        void logout();
                      }}
                      className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-slate-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openLoginModal({
                      mode: "login",
                      redirectTo: pathname,
                    });
                  }}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {loading ? "Loading..." : "Login"}
                </button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
