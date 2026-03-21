"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  FolderKanban,
  GraduationCap,
} from "lucide-react";
import type { ReportTemplate } from "@/types/editor";

interface TemplateCardProps {
  template: ReportTemplate;
}

function getTemplateIcon(templateId: string) {
  switch (templateId) {
    case "research-report":
      return <FileText className="h-5 w-5" />;
    case "lab-report":
      return <FlaskConical className="h-5 w-5" />;
    case "project-report":
      return <FolderKanban className="h-5 w-5" />;
    default:
      return <GraduationCap className="h-5 w-5" />;
  }
}

export default function TemplateCard({ template }: TemplateCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-3 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
          {getTemplateIcon(template.id)}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {template.sections.length} Sections
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">{template.name}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{template.description}</p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Sections Preview
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {template.sections.slice(0, 4).map((section, index) => (
            <li key={section.id} className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
              {index + 1}. {section.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {template.sections.reduce((count, section) => count + section.subsections.length, 0)} subsection blocks included
        </p>
        <Link
          href={`/editor/${template.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Use Template
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}
