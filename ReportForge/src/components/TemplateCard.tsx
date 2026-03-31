"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  FolderKanban,
  GraduationCap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { buildEditorRoute } from "@/lib/routes";
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
  const router = useRouter();

  const openTemplate = () => {
    router.push(buildEditorRoute(template.id));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTemplate();
    }
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      onClick={openTemplate}
      onKeyDown={handleKeyDown}
      className="group rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition duration-200 hover:border-slate-300 hover:shadow-[0_18px_44px_rgba(15,23,42,0.14)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-3 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
          {getTemplateIcon(template.id)}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {template.sections.length} Sections
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {template.name}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {template.description}
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Sections Preview
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {template.sections.slice(0, 4).map((section, index) => (
            <li
              key={section.id}
              className="rounded-lg bg-white px-3 py-2 dark:bg-slate-900"
            >
              {index + 1}. {section.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {template.sections.reduce(
            (count, section) => count + section.subsections.length,
            0
          )}{" "}
          subsection blocks included
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openTemplate();
          }}
          className="inline-flex translate-y-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:group-hover:bg-white"
        >
          Use Template
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.article>
  );
}
