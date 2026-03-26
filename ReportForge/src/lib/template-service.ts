import { getTemplateById, getTemplates } from "@/data/templates";
import {
  DEFAULT_FONT_LIBRARY,
  normalizeDocumentSettings,
  normalizeFontLibrary,
} from "@/lib/document-settings";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  ReportSection,
  ReportSubsection,
  ReportTemplate,
  TemplateRow,
  TemplateStructure,
  TemplateStructureSection,
} from "@/types/editor";

const TEMPLATE_FIELDS = "id, name, description, structure, created_at";
const TEMPLATE_CACHE_TTL_MS = 60_000;

let templateCache: ReportTemplate[] | null = null;
let templateRowsCache: TemplateRow[] | null = null;
let templateCacheExpiresAt = 0;
let templateRowsCacheExpiresAt = 0;
let templateCachePromise: Promise<ReportTemplate[]> | null = null;
let templateRowsPromise: Promise<TemplateRow[]> | null = null;

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const createSectionId = (title: string, index: number) => {
  const slug = slugify(title) || `section-${index + 1}`;
  return `${slug}-${index + 1}`;
};

const createSubsectionId = (title: string, sectionIndex: number, subsectionIndex: number) => {
  const slug = slugify(title) || `subsection-${sectionIndex + 1}-${subsectionIndex + 1}`;
  return `${slug}-${sectionIndex + 1}-${subsectionIndex + 1}`;
};

const isTemplateStructure = (value: unknown): value is TemplateStructure => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as { sections?: unknown };
  return Array.isArray(record.sections);
};

const normalizeSubsections = (rawSubsections: unknown, sectionIndex: number): ReportSubsection[] => {
  if (!Array.isArray(rawSubsections)) {
    return [];
  }

  return rawSubsections.reduce<ReportSubsection[]>((accumulator, rawSubsection, subsectionIndex) => {
    if (typeof rawSubsection === "string") {
      const title = rawSubsection.trim() || `Subsection ${subsectionIndex + 1}`;
      accumulator.push({
        id: createSubsectionId(title, sectionIndex, subsectionIndex),
        title,
        content: "",
      });
      return accumulator;
    }

    if (!rawSubsection || typeof rawSubsection !== "object") {
      return accumulator;
    }

    const subsection = rawSubsection as { title?: unknown; content?: unknown };
    const titleValue =
      typeof subsection.title === "string" && subsection.title.trim()
        ? subsection.title.trim()
        : `Subsection ${subsectionIndex + 1}`;
    const contentValue =
      typeof subsection.content === "string" ? subsection.content : "";

    accumulator.push({
      id: createSubsectionId(titleValue, sectionIndex, subsectionIndex),
      title: titleValue,
      content: contentValue,
    });

    return accumulator;
  }, []);
};

const normalizeSections = (structure: TemplateStructure): ReportSection[] => {
  const rawSections = Array.isArray(structure.sections) ? structure.sections : [];

  return rawSections.reduce<ReportSection[]>((accumulator, rawSection, sectionIndex) => {
    if (!rawSection || typeof rawSection !== "object") {
      return accumulator;
    }

    const section = rawSection as TemplateStructureSection;
    const titleValue =
      typeof section.title === "string" && section.title.trim()
        ? section.title.trim()
        : `Section ${sectionIndex + 1}`;
    const contentValue =
      typeof section.content === "string" ? section.content : "";

    accumulator.push({
      id: createSectionId(titleValue, sectionIndex),
      title: titleValue,
      content: contentValue,
      subsections: normalizeSubsections(section.subsections, sectionIndex),
    });

    return accumulator;
  }, []);
};

const cacheTemplates = (templates: ReportTemplate[]) => {
  templateCache = templates;
  templateCacheExpiresAt = Date.now() + TEMPLATE_CACHE_TTL_MS;
};

const cacheTemplateRows = (rows: TemplateRow[]) => {
  templateRowsCache = rows;
  templateRowsCacheExpiresAt = Date.now() + TEMPLATE_CACHE_TTL_MS;
};

const hasFreshTemplateCache = () => {
  return Boolean(templateCache && Date.now() < templateCacheExpiresAt);
};

const hasFreshTemplateRowCache = () => {
  return Boolean(templateRowsCache && Date.now() < templateRowsCacheExpiresAt);
};

export const clearTemplateCache = () => {
  templateCache = null;
  templateRowsCache = null;
  templateCacheExpiresAt = 0;
  templateRowsCacheExpiresAt = 0;
  templateCachePromise = null;
  templateRowsPromise = null;
};

export const templateToStructure = (template: ReportTemplate): TemplateStructure => {
  return {
    name: template.name,
    style: template.style,
    coverFields: template.coverFields,
    coverTemplate: template.coverTemplate,
    fonts: template.fonts,
    sections: template.sections.map((section) => ({
      title: section.title,
      content: section.content,
      subsections: section.subsections.map((subsection) => ({
        title: subsection.title,
        content: subsection.content,
      })),
    })),
  };
};

export const rowToTemplate = (row: TemplateRow): ReportTemplate => {
  const parsedStructure = (() => {
    if (typeof row.structure === "string") {
      try {
        const parsed = JSON.parse(row.structure);
        return isTemplateStructure(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }

    return isTemplateStructure(row.structure) ? row.structure : null;
  })();

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sections: parsedStructure ? normalizeSections(parsedStructure) : [],
    style: parsedStructure?.style
      ? normalizeDocumentSettings(parsedStructure.style)
      : normalizeDocumentSettings(undefined),
    coverFields: parsedStructure?.coverFields,
    coverTemplate: parsedStructure?.coverTemplate,
    fonts: parsedStructure?.fonts
      ? normalizeFontLibrary(parsedStructure.fonts)
      : [...DEFAULT_FONT_LIBRARY],
  };
};

export const fetchTemplatesFromSource = async (): Promise<ReportTemplate[]> => {
  if (hasFreshTemplateCache() && templateCache) {
    return templateCache;
  }

  if (templateCachePromise) {
    return templateCachePromise;
  }

  templateCachePromise = (async () => {
    if (!isSupabaseConfigured || !supabase) {
      const fallbackTemplates = getTemplates();
      cacheTemplates(fallbackTemplates);
      return fallbackTemplates;
    }

    const { data, error } = await supabase
      .from("templates")
      .select(TEMPLATE_FIELDS)
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      const fallbackTemplates = getTemplates();
      cacheTemplates(fallbackTemplates);
      return fallbackTemplates;
    }

    const templates = data.map((row) => rowToTemplate(row as TemplateRow));
    cacheTemplates(templates);
    return templates;
  })().finally(() => {
    templateCachePromise = null;
  });

  return templateCachePromise;
};

export const fetchTemplateByIdFromSource = async (
  templateId: string
): Promise<ReportTemplate | null> => {
  if (!templateId) {
    return null;
  }

  const templates = await fetchTemplatesFromSource();
  const cachedTemplate = templates.find((template) => template.id === templateId);

  if (cachedTemplate) {
    return cachedTemplate;
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("templates")
      .select(TEMPLATE_FIELDS)
      .eq("id", templateId)
      .maybeSingle();

    if (!error && data) {
      return rowToTemplate(data as TemplateRow);
    }
  }

  return getTemplateById(templateId);
};

export const fetchTemplateRowsForAdmin = async (): Promise<TemplateRow[]> => {
  if (hasFreshTemplateRowCache() && templateRowsCache) {
    return templateRowsCache;
  }

  if (templateRowsPromise) {
    return templateRowsPromise;
  }

  templateRowsPromise = (async () => {
    if (!isSupabaseConfigured || !supabase) {
      const fallbackRows = getTemplates().map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        structure: templateToStructure(template),
        created_at: undefined,
      }));
      cacheTemplateRows(fallbackRows);
      return fallbackRows;
    }

    const { data, error } = await supabase
      .from("templates")
      .select(TEMPLATE_FIELDS)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as TemplateRow[];
    cacheTemplateRows(rows);
    return rows;
  })().finally(() => {
    templateRowsPromise = null;
  });

  return templateRowsPromise;
};

export const createTemplateInDb = async (
  payload: Pick<TemplateRow, "name" | "description" | "structure">
) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("templates").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  clearTemplateCache();
};

export const updateTemplateInDb = async (
  templateId: string,
  payload: Pick<TemplateRow, "name" | "description" | "structure">
) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("templates").update(payload).eq("id", templateId);

  if (error) {
    throw new Error(error.message);
  }

  clearTemplateCache();
};

export const deleteTemplateFromDb = async (templateId: string) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("templates").delete().eq("id", templateId);

  if (error) {
    throw new Error(error.message);
  }

  clearTemplateCache();
};

export const getTemplateStructureExample = (): TemplateStructure => {
  return {
    name: "Research Report",
    style: normalizeDocumentSettings(undefined),
    coverTemplate: {
      eyebrow: "Academic Report",
      subtitle: "A structured document designed for review and export.",
      note: "",
    },
    fonts: [...DEFAULT_FONT_LIBRARY],
    sections: [
      {
        title: "Abstract",
        subsections: [],
      },
      {
        title: "Introduction",
        subsections: ["Background", "Problem Statement", "Objectives"],
      },
    ],
  };
};
