import { DashboardListSkeleton } from "@/components/PageSkeletons";

export default function DashboardLoading() {
  return (
    <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-1/2 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
          <DashboardListSkeleton />
        </div>
      </div>
    </main>
  );
}
