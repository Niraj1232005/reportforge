"use client";

import { ArrowUp, Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLastEditorPath } from "@/hooks/useLastEditorPath";
import {
  ABOUT_ROUTE,
  HOME_ROUTE,
  TEMPLATES_ROUTE,
} from "@/lib/routes";

const socialLinks = [
  {
    href: "https://github.com/Niraj1232005",
    label: "GitHub",
    icon: Github,
  },
  {
    href: "https://x.com/NirajRatho91596",
    label: "Twitter",
    icon: Twitter,
  },
  {
    href: "https://linkedin.com/niraj14",
    label: "LinkedIn",
    icon: Linkedin,
  },
];

export default function AppFooter() {
  const pathname = usePathname();
  const { user } = useAuth();
  const lastEditorPath = useLastEditorPath(pathname, user?.id);

  return (
    <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              ReportForge
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Professional reports without the formatting mess
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              A structured writing workspace for academic, technical, and project documentation with
              live A4 preview and export-ready output.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Product</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <Link href={HOME_ROUTE} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                Home
              </Link>
              <Link href={TEMPLATES_ROUTE} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                Templates
              </Link>
              <Link href={lastEditorPath ?? TEMPLATES_ROUTE} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                Editor
              </Link>
              <Link href={ABOUT_ROUTE} className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                About
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contact</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <a href="mailto:support@reportforge.app" className="block transition hover:text-blue-600 dark:hover:text-blue-400">
                support@reportforge.app
              </a>
              <p>Mon to Fri, 9:00 AM to 6:00 PM</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 lg:items-end">
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    aria-label={link.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowUp className="h-4 w-4" />
              Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
