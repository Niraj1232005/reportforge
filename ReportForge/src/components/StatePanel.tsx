"use client";

import { AlertCircle, FilePlus2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type StateTone = "default" | "error";

interface StatePanelProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ReactNode;
  tone?: StateTone;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function StatePanel({
  title,
  description,
  eyebrow,
  icon,
  tone = "default",
  actionLabel,
  actionHref,
  onAction,
}: StatePanelProps) {
  const toneClasses =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
      : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100";

  const descriptionClasses =
    tone === "error"
      ? "text-red-700 dark:text-red-300"
      : "text-slate-600 dark:text-slate-400";

  const iconNode =
    icon ??
    (tone === "error" ? (
      <AlertCircle className="h-5 w-5" />
    ) : (
      <FilePlus2 className="h-5 w-5" />
    ));

  const actionButtonClass =
    tone === "error"
      ? "inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
      : "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white";

  return (
    <section className={`rounded-2xl border p-6 shadow-sm ${toneClasses}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="inline-flex rounded-2xl bg-white/75 p-3 shadow-sm dark:bg-slate-900/80">
            {iconNode}
          </div>
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${descriptionClasses}`}>
              {description}
            </p>
          </div>
        </div>

        {actionLabel ? (
          actionHref ? (
            <Link href={actionHref} className={actionButtonClass}>
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onAction} className={actionButtonClass}>
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
