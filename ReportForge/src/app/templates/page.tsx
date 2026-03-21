"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import TemplateCard from "@/components/TemplateCard";
import { fetchTemplatesFromSource } from "@/lib/template-service";
import type { ReportTemplate } from "@/types/editor";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTemplates = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const rows = await fetchTemplatesFromSource();
        if (!cancelled) {
          setTemplates(rows);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load templates");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="px-4 pb-16 pt-10 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                Template Library
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold text-slate-900 md:text-5xl dark:text-slate-100">
                Choose a polished starting point
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
                Start with a clean structure, then refine the document in the editor with live A4
                preview and export-ready formatting.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Home
            </Link>
          </div>
        </motion.header>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            Loading templates...
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !templates.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            No templates found.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.05 }}
            >
              <TemplateCard template={template} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
