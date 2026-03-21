"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, LayoutPanelTop, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { getTemplates } from "@/data/templates";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const templates = getTemplates().slice(0, 3);

  return (
    <main className="overflow-hidden">
      <section className="relative px-4 pb-20 pt-14 md:px-8 lg:px-10 lg:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-0 h-[30rem] w-[30rem] rounded-full bg-blue-100/80 blur-3xl" />
          <div className="absolute right-[-8%] top-28 h-[24rem] w-[24rem] rounded-full bg-slate-200/70 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: 0.12 }}>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Niraj Rathod
            </motion.div>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="font-heading mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] text-slate-900 md:text-7xl"
            >
              A cleaner document workspace for fast drafting, live preview, and polished export.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-6 max-w-2xl text-lg leading-8 text-slate-600"
            >
              ReportForge gives teams a professional editor with structure-aware blocks, resizable
              panels, and a real page preview that stays aligned with the DOCX you ship.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/editor/research-report"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Open Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                Browse Templates
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <div className="surface-card relative overflow-hidden rounded-[2rem] p-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                      Live Workspace
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Three-panel editing</h2>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                    A4 Preview
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[0.28fr_0.38fr_0.34fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Outline</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p className="rounded-lg bg-slate-50 px-3 py-2">1. Introduction</p>
                      <p className="rounded-lg bg-slate-50 px-3 py-2">1.1 Background</p>
                      <p className="rounded-lg bg-slate-50 px-3 py-2">2. Methodology</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Editor</p>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Heading 1</p>
                        <p className="mt-2 text-sm text-slate-700">Introduction</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Paragraph</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Edit blocks, collapse sections, and keep spacing tidy while the document stays readable.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</p>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-center text-[11px] text-slate-400">Page 1</p>
                      <p className="mt-4 text-center font-serif text-lg font-semibold text-slate-900">Research Report</p>
                      <p className="mt-5 font-serif text-sm leading-7 text-slate-700">
                        The preview mirrors the export structure with the same typography, margins, and pagination.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-3">
            {[
              {
                icon: LayoutPanelTop,
                title: "Professional layout",
                body: "Fixed workspace panels, sticky tools, and cleaner spacing keep the editor feeling light instead of overwhelming.",
              },
              {
                icon: WandSparkles,
                title: "Preview that stays honest",
                body: "Work against a realistic page model with white paper, proper margins, and the same document settings used by export.",
              },
              {
                icon: FileText,
                title: "Template-ready workflow",
                body: "Start from structured report templates and keep formatting, cover pages, and document controls aligned across teams.",
              },
            ].map((feature, index) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.08 }}
                className="max-w-md"
              >
                <div className="inline-flex rounded-2xl bg-white p-3 text-blue-600 shadow-sm">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-3 text-base leading-8 text-slate-600">{feature.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-20 md:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Templates</p>
              <h2 className="font-heading mt-2 text-4xl font-semibold text-slate-900">
                Start from a document structure that already feels intentional
              </h2>
            </div>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-blue-600"
            >
              View all templates
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {templates.map((template, index) => (
              <motion.article
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.08 }}
                className="border-b border-slate-200 pb-8"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {template.sections.length} sections
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">{template.name}</h3>
                <p className="mt-3 text-base leading-8 text-slate-600">{template.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 md:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Ready</p>
          <h2 className="font-heading mt-4 text-4xl font-semibold text-slate-900 md:text-5xl">
            Build documents with a workspace that feels polished before the interview demo.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Draft faster, preview with confidence, and export a document that matches what you just reviewed.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/editor/research-report"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Launch Editor
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Explore Templates
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
