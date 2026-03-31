"use client";

export function TemplateGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`template-skeleton-${index}`}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="animate-pulse space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-3">
              <div className="h-8 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`report-skeleton-${index}`}
          className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="h-5 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-4 h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
