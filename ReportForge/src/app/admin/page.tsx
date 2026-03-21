"use client";

import { motion } from "framer-motion";
import { Edit3, GripVertical, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DOCUMENT_SETTINGS,
  DEFAULT_FONT_LIBRARY,
  normalizeFontLibrary,
  readFontLibraryFromStorage,
  writeFontLibraryToStorage,
} from "@/lib/document-settings";
import {
  createTemplateInDb,
  deleteTemplateFromDb,
  fetchTemplateRowsForAdmin,
  getTemplateStructureExample,
  updateTemplateInDb,
} from "@/lib/template-service";
import { isSupabaseConfigured } from "@/lib/supabase";
import type {
  CoverPageTemplate,
  TemplateCoverFields,
  TemplateRow,
  TemplateStructure,
  TemplateStructureSection,
  TemplateStyleSettings,
} from "@/types/editor";

const ADMIN_SESSION_KEY = "reportforge_admin_unlocked";

interface BuilderSubsection {
  id: string;
  title: string;
}

interface BuilderSection {
  id: string;
  title: string;
  subsections: BuilderSubsection[];
}

const createBuilderSectionId = (title: string, index: number) => {
  const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || `section-${index + 1}`;
  return `${base}-${index + 1}`;
};

const createBuilderSubsectionId = (title: string, sectionIndex: number, subsectionIndex: number) => {
  const base =
    title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    `subsection-${sectionIndex + 1}-${subsectionIndex + 1}`;
  return `${base}-${sectionIndex + 1}-${subsectionIndex + 1}`;
};

const defaultStyleSettings: TemplateStyleSettings = { ...DEFAULT_DOCUMENT_SETTINGS };

const defaultCoverFields: TemplateCoverFields = {
  collegeName: true,
  studentName: true,
  course: true,
  supervisor: false,
  logo: true,
};

const defaultCoverTemplate: CoverPageTemplate = {
  eyebrow: "Academic Report",
  subtitle: "A structured document designed for review and export.",
  note: "",
};

const toTemplateStructure = (value: unknown): TemplateStructure => {
  if (!value) {
    return getTemplateStructureExample();
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { sections?: unknown }).sections)) {
        return parsed as TemplateStructure;
      }
    } catch {
      return getTemplateStructureExample();
    }
  }

  if (typeof value === "object" && Array.isArray((value as { sections?: unknown }).sections)) {
    return value as TemplateStructure;
  }

  return getTemplateStructureExample();
};

const sectionsFromStructure = (structure: TemplateStructure): BuilderSection[] => {
  const raw = Array.isArray(structure.sections) ? structure.sections : [];
  if (!raw.length) {
    return [
      {
        id: createBuilderSectionId("Abstract", 0),
        title: "Abstract",
        subsections: [],
      },
      {
        id: createBuilderSectionId("Introduction", 1),
        title: "Introduction",
        subsections: [
          { id: createBuilderSubsectionId("Background", 1, 0), title: "Background" },
          { id: createBuilderSubsectionId("Problem Statement", 1, 1), title: "Problem Statement" },
        ],
      },
    ];
  }

  return raw.map((section, sectionIndex) => {
    const title = section.title || `Section ${sectionIndex + 1}`;
    const subsectionsArray = Array.isArray(section.subsections) ? section.subsections : [];
    const subsections: BuilderSubsection[] = subsectionsArray.map((subsection, subsectionIndex) => {
      const titleValue =
        typeof subsection === "string"
          ? subsection
          : (subsection as TemplateStructureSection["subsections"][number] & { title?: string }).title || "Subsection";
      return {
        id: createBuilderSubsectionId(titleValue, sectionIndex, subsectionIndex),
        title: titleValue,
      };
    });

    return {
      id: createBuilderSectionId(title, sectionIndex),
      title,
      subsections,
    };
  });
};

const structureFromBuilder = (
  name: string,
  sections: BuilderSection[],
  style: TemplateStyleSettings,
  coverFields: TemplateCoverFields,
  coverTemplate: CoverPageTemplate,
  fonts: string[]
): TemplateStructure => {
  return {
    name: name || undefined,
    sections: sections.map((section) => ({
      title: section.title || "Untitled Section",
      content: "",
      subsections: section.subsections.map((subsection) => ({
        title: subsection.title || "Untitled Subsection",
        content: "",
      })),
    })),
    style,
    coverFields,
    coverTemplate,
    fonts,
  };
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<BuilderSection[]>(() =>
    sectionsFromStructure(getTemplateStructureExample())
  );
  const [style, setStyle] = useState<TemplateStyleSettings>(defaultStyleSettings);
  const [coverFields, setCoverFields] = useState<TemplateCoverFields>(defaultCoverFields);
  const [coverTemplate, setCoverTemplate] = useState<CoverPageTemplate>(defaultCoverTemplate);
  const [fontLibrary, setFontLibrary] = useState<string[]>(DEFAULT_FONT_LIBRARY);
  const [newFontName, setNewFontName] = useState("");
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  const expectedPassword = useMemo(() => {
    return process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "ADMIN_SESSION_KEY";
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setFormError(null);

    try {
      const rows = await fetchTemplateRowsForAdmin();
      setTemplates(rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load templates";
      setFormError(message);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    const unlockedSession = window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
    setUnlocked(unlockedSession);
    setFontLibrary(normalizeFontLibrary(readFontLibraryFromStorage()));
  }, []);

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    void loadTemplates();
  }, [unlocked]);

  const resetForm = () => {
    setEditingTemplateId(null);
    setName("");
    setDescription("");
    const example = getTemplateStructureExample();
    setSections(sectionsFromStructure(example));
    setStyle({ ...defaultStyleSettings });
    setCoverFields(defaultCoverFields);
    setCoverTemplate(defaultCoverTemplate);
  };

  const handleUnlock = () => {
    if (password !== expectedPassword) {
      setAuthError("Incorrect admin password.");
      return;
    }

    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    setUnlocked(true);
    setAuthError(null);
    setPassword("");
  };

  const handleAddFont = () => {
    const normalized = newFontName.trim();
    if (!normalized) {
      return;
    }

    setFontLibrary((current) => {
      const next = normalizeFontLibrary([normalized, ...current]);
      writeFontLibraryToStorage(next);
      return next;
    });
    setNewFontName("");
  };

  const handleRemoveFont = (fontName: string) => {
    setFontLibrary((current) => {
      const next = normalizeFontLibrary(
        current.filter((font) => font !== fontName || font === DEFAULT_DOCUMENT_SETTINGS.fontFamily)
      );
      writeFontLibraryToStorage(next);
      return next;
    });

    if (style.fontFamily === fontName) {
      setStyle((current) => ({ ...current, fontFamily: DEFAULT_DOCUMENT_SETTINGS.fontFamily }));
    }
  };

  const handleAddSection = () => {
    setSections((current) => {
      const index = current.length;
      const title = `Section ${index + 1}`;
      return [
        ...current,
        {
          id: createBuilderSectionId(title, index),
          title,
          subsections: [],
        },
      ];
    });
  };

  const handleAddSubsection = (sectionId: string) => {
    setSections((current) =>
      current.map((section, sectionIndex) => {
        if (section.id !== sectionId) {
          return section;
        }

        const index = section.subsections.length;
        const title = `Subsection ${index + 1}`;
        return {
          ...section,
          subsections: [
            ...section.subsections,
            {
              id: createBuilderSubsectionId(title, sectionIndex, index),
              title,
            },
          ],
        };
      })
    );
  };

  const handleRenameSection = (sectionId: string, title: string) => {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? { ...section, title } : section))
    );
  };

  const handleRenameSubsection = (sectionId: string, subsectionId: string, title: string) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          subsections: section.subsections.map((subsection) =>
            subsection.id === subsectionId ? { ...subsection, title } : subsection
          ),
        };
      })
    );
  };

  const handleDeleteSection = (sectionId: string) => {
    setSections((current) => current.filter((section) => section.id !== sectionId));
  };

  const handleDeleteSubsection = (sectionId: string, subsectionId: string) => {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          subsections: section.subsections.filter((subsection) => subsection.id !== subsectionId),
        };
      })
    );
  };

  const handleSectionDragStart = (sectionId: string) => {
    setDraggingSectionId(sectionId);
  };

  const handleSectionDragOver = (event: React.DragEvent<HTMLDivElement>, overSectionId: string) => {
    event.preventDefault();
    if (!draggingSectionId || draggingSectionId === overSectionId) {
      return;
    }

    setSections((current) => {
      const fromIndex = current.findIndex((section) => section.id === draggingSectionId);
      const toIndex = current.findIndex((section) => section.id === overSectionId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSectionDragEnd = () => {
    setDraggingSectionId(null);
  };

  const handleSubmitTemplate = async () => {
    if (!name.trim()) {
      setFormError("Template name is required.");
      return;
    }

    if (!sections.length) {
      setFormError("Add at least one section to the template.");
      return;
    }

    const normalizedFonts = normalizeFontLibrary(fontLibrary);
    writeFontLibraryToStorage(normalizedFonts);

    const structurePayload = structureFromBuilder(
      name.trim(),
      sections,
      style,
      coverFields,
      coverTemplate,
      normalizedFonts
    );

    setIsSubmitting(true);
    setFormError(null);
    setFormMessage(null);

    try {
      if (editingTemplateId) {
        await updateTemplateInDb(editingTemplateId, {
          name: name.trim(),
          description: description.trim(),
          structure: structurePayload,
        });
        setFormMessage("Template updated.");
      } else {
        await createTemplateInDb({
          name: name.trim(),
          description: description.trim(),
          structure: structurePayload,
        });
        setFormMessage("Template created.");
      }

      resetForm();
      await loadTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save template";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = (template: TemplateRow) => {
    setEditingTemplateId(template.id);
    setName(template.name);
    setDescription(template.description ?? "");
    const structure = toTemplateStructure(template.structure);
    setSections(sectionsFromStructure(structure));
    setStyle(structure.style ?? defaultStyleSettings);
    setCoverFields(structure.coverFields ?? defaultCoverFields);
    setCoverTemplate(structure.coverTemplate ?? defaultCoverTemplate);
    setFontLibrary(normalizeFontLibrary(structure.fonts ?? fontLibrary));
    setFormMessage(null);
    setFormError(null);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const confirmDelete = window.confirm("Delete this template?");
    if (!confirmDelete) {
      return;
    }

    setFormError(null);
    setFormMessage(null);

    try {
      await deleteTemplateFromDb(templateId);
      setFormMessage("Template deleted.");
      await loadTemplates();

      if (editingTemplateId === templateId) {
        resetForm();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete template";
      setFormError(message);
    }
  };

  if (!unlocked) {
    return (
      <main className="px-6 py-12 md:px-10 bg-white">
        <div className="mx-auto max-w-xl">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white px-8 py-9 shadow-sm"
          >
            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-2 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-slate-900">Admin Panel</h1>
            <p className="mb-5 text-sm text-slate-600">
              Enter the admin password to manage templates.
            </p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Admin password"
              className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            {authError ? <p className="mb-3 text-sm text-red-600">{authError}</p> : null}
            <button
              type="button"
              onClick={handleUnlock}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Unlock Admin
            </button>
          </motion.section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 pb-12 pt-10 md:px-10 bg-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Template Management</h1>
          <p className="mt-2 text-sm text-slate-600">
            Design visual templates with sections, styles, and cover fields. Saved to Supabase, no JSON editing required.
          </p>
          {!isSupabaseConfigured ? (
            <p className="mt-2 text-sm text-amber-700">
              Supabase env vars are missing. You can view fallback templates, but create/update/delete is disabled.
            </p>
          ) : null}
        </header>

        <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {editingTemplateId ? "Edit Template" : "Add Template"}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Description
                  </label>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Sections
                    </p>
                    <p className="text-xs text-slate-500">Outline for the document (sections and subsections).</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Section
                  </button>
                </div>
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      draggable
                      onDragStart={() => handleSectionDragStart(section.id)}
                      onDragOver={(event) => handleSectionDragOver(event, section.id)}
                      onDragEnd={handleSectionDragEnd}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-300 bg-white p-1 text-slate-500"
                            aria-label="Drag section"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-semibold text-slate-500 w-5">{index + 1}</span>
                          <input
                            value={section.title}
                            onChange={(event) => handleRenameSection(section.id, event.target.value)}
                            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(section.id)}
                          className="rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="ml-10 space-y-1">
                        {section.subsections.map((subsection) => (
                          <div key={subsection.id} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">-&gt;</span>
                            <input
                              value={subsection.title}
                              onChange={(event) =>
                                handleRenameSubsection(section.id, subsection.id, event.target.value)
                              }
                              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteSubsection(section.id, subsection.id)}
                              className="rounded-md border border-red-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddSubsection(section.id)}
                          className="mt-1 inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                          Add Subsection
                        </button>
                      </div>
                    </div>
                  ))}
                  {!sections.length ? (
                    <p className="text-xs text-slate-500">
                      No sections yet. Use &quot;Add Section&quot; to define the document outline.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Font Management
                    </p>
                    <p className="text-xs text-slate-500">Shared font library for editor and template defaults.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setStyle((current) => ({
                        ...current,
                        fontFamily: DEFAULT_DOCUMENT_SETTINGS.fontFamily,
                      }))
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Reset Default
                  </button>
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    value={newFontName}
                    onChange={(event) => setNewFontName(event.target.value)}
                    placeholder="Add a font family"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddFont}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add Font
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {fontLibrary.map((font) => (
                    <div
                      key={font}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => setStyle((current) => ({ ...current, fontFamily: font }))}
                        className="font-semibold"
                      >
                        {font}
                      </button>
                      {font !== DEFAULT_DOCUMENT_SETTINGS.fontFamily ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveFont(font)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-slate-400">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Document Style
                </p>
                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Font Family
                    </label>
                    <select
                      value={style.fontFamily}
                      onChange={(event) =>
                        setStyle((current) => ({ ...current, fontFamily: event.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    >
                      {fontLibrary.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Body Font Size (pt)
                    </label>
                    <input
                      type="number"
                      min={8}
                      max={18}
                      value={style.bodyFontSize}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          bodyFontSize: Number(event.target.value) || 12,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Heading 1 Size (pt)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={28}
                      value={style.heading1Size}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          heading1Size: Number(event.target.value) || 18,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Heading 2 Size (pt)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={24}
                      value={style.heading2Size}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          heading2Size: Number(event.target.value) || 16,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Heading 3 Size (pt)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={20}
                      value={style.heading3Size}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          heading3Size: Number(event.target.value) || 14,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Paragraph Alignment
                    </label>
                    <select
                      value={style.paragraphAlign}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          paragraphAlign: event.target.value as TemplateStyleSettings["paragraphAlign"],
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    >
                      <option value="left">Left</option>
                      <option value="justify">Justify</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Line Spacing
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={2}
                      step={0.1}
                      value={style.lineSpacing}
                      onChange={(event) =>
                        setStyle((current) => ({
                          ...current,
                          lineSpacing: Number(event.target.value) || 1.5,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cover Page Fields
                </p>
                <div className="grid gap-1 text-xs md:grid-cols-2">
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={coverFields.collegeName}
                      onChange={(event) =>
                        setCoverFields((current) => ({ ...current, collegeName: event.target.checked }))
                      }
                    />
                    College Name
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={coverFields.studentName}
                      onChange={(event) =>
                        setCoverFields((current) => ({ ...current, studentName: event.target.checked }))
                      }
                    />
                    Student Name
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={coverFields.course}
                      onChange={(event) =>
                        setCoverFields((current) => ({ ...current, course: event.target.checked }))
                      }
                    />
                    Course
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={coverFields.supervisor}
                      onChange={(event) =>
                        setCoverFields((current) => ({ ...current, supervisor: event.target.checked }))
                      }
                    />
                    Supervisor
                  </label>
                  <label className="inline-flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      checked={coverFields.logo}
                      onChange={(event) =>
                        setCoverFields((current) => ({ ...current, logo: event.target.checked }))
                      }
                    />
                    Logo Upload
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Cover Page Template
                </p>
                <div className="grid gap-2 text-xs">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Cover Eyebrow
                    </label>
                    <input
                      value={coverTemplate.eyebrow ?? ""}
                      onChange={(event) =>
                        setCoverTemplate((current) => ({ ...current, eyebrow: event.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Cover Subtitle
                    </label>
                    <input
                      value={coverTemplate.subtitle ?? ""}
                      onChange={(event) =>
                        setCoverTemplate((current) => ({ ...current, subtitle: event.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Cover Note
                    </label>
                    <input
                      value={coverTemplate.note ?? ""}
                      onChange={(event) =>
                        setCoverTemplate((current) => ({ ...current, note: event.target.value }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-200"
                    />
                  </div>
                </div>
              </div>

              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              {formMessage ? <p className="text-sm text-emerald-700">{formMessage}</p> : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSubmitTemplate}
                  disabled={isSubmitting || !isSupabaseConfigured}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingTemplateId ? (
                    <>
                      <Save className="h-4 w-4" />
                      Update Template
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Template
                    </>
                  )}
                </button>
                {editingTemplateId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Existing Templates</h2>
            {loadingTemplates ? <p className="text-sm text-slate-600">Loading templates...</p> : null}

            {!loadingTemplates && templates.length === 0 ? (
              <p className="text-sm text-slate-600">No templates found.</p>
            ) : null}

            <div className="space-y-3">
              {templates.map((template, index) => {
                const structure = toTemplateStructure(template.structure);
                const rawSections = Array.isArray(structure.sections) ? structure.sections : [];

                return (
                  <article
                    key={template.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Template {index + 1}
                        </p>
                        <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                        <p className="text-xs text-slate-500">{template.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditTemplate(template)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={!isSupabaseConfigured}
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {rawSections.length} Sections
                    </p>
                    {rawSections.length ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                        {rawSections.slice(0, 5).map((section, sectionIndex) => (
                          <li key={`${template.id}-section-${sectionIndex}`}>
                            {sectionIndex + 1}. {(section as TemplateStructureSection).title}
                          </li>
                        ))}
                        {rawSections.length > 5 ? (
                          <li className="text-[11px] text-slate-400">
                            + {rawSections.length - 5} more section(s)
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
