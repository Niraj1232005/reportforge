import sharedDocumentSettings from "@/shared/document-settings.json";
import type {
  DocumentMargins,
  DocumentPageBreakRules,
  DocumentPageSettings,
  DocumentSpacingSettings,
  DocumentStyleSettings,
  TitlePageSpacingSettings,
} from "@/types/editor";

export const FONT_LIBRARY_STORAGE_KEY = "reportforge-font-library";

export const DEFAULT_FONT_LIBRARY = [
  "Times New Roman",
  "Cambria",
  "Georgia",
  "Garamond",
  "Arial",
  "Calibri",
];

type DocumentSettingsInput = Partial<DocumentStyleSettings> &
  Partial<{
    heading1Size: number;
    heading2Size: number;
    heading3Size: number;
    marginTopIn: number;
    marginBottomIn: number;
    marginLeftIn: number;
    marginRightIn: number;
    pageBreakAfterHeading1: boolean;
  }>;

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const cloneObject = <T extends Record<string, unknown>>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

export const sanitizeFontName = (value: string) => {
  return value.replace(/["<>]/g, "").trim();
};

const normalizeTitlePageSpacing = (
  value: unknown,
  fallback: TitlePageSpacingSettings
): TitlePageSpacingSettings => {
  const source = isRecord(value) ? value : {};

  return {
    logoAfterPt: clamp(Number(source.logoAfterPt ?? fallback.logoAfterPt), 0, 48),
    eyebrowFontSizePt: clamp(
      Number(source.eyebrowFontSizePt ?? fallback.eyebrowFontSizePt),
      9,
      18
    ),
    eyebrowAfterPt: clamp(
      Number(source.eyebrowAfterPt ?? fallback.eyebrowAfterPt),
      0,
      36
    ),
    collegeAfterPt: clamp(Number(source.collegeAfterPt ?? fallback.collegeAfterPt), 0, 36),
    titleAfterPt: clamp(Number(source.titleAfterPt ?? fallback.titleAfterPt), 0, 36),
    studentAfterPt: clamp(Number(source.studentAfterPt ?? fallback.studentAfterPt), 0, 36),
    courseFontSizePt: clamp(
      Number(source.courseFontSizePt ?? fallback.courseFontSizePt),
      9,
      18
    ),
    courseAfterPt: clamp(Number(source.courseAfterPt ?? fallback.courseAfterPt), 0, 36),
    subtitleFontSizePt: clamp(
      Number(source.subtitleFontSizePt ?? fallback.subtitleFontSizePt),
      9,
      18
    ),
    subtitleBeforePt: clamp(
      Number(source.subtitleBeforePt ?? fallback.subtitleBeforePt),
      0,
      48
    ),
    subtitleAfterPt: clamp(
      Number(source.subtitleAfterPt ?? fallback.subtitleAfterPt),
      0,
      36
    ),
    noteFontSizePt: clamp(Number(source.noteFontSizePt ?? fallback.noteFontSizePt), 8, 18),
    noteAfterPt: clamp(Number(source.noteAfterPt ?? fallback.noteAfterPt), 0, 36),
  };
};

const normalizeSpacing = (
  value: unknown,
  fallback: DocumentSpacingSettings
): DocumentSpacingSettings => {
  const source = isRecord(value) ? value : {};

  return {
    paragraphAfterPt: clamp(
      Number(source.paragraphAfterPt ?? fallback.paragraphAfterPt),
      0,
      36
    ),
    headingAfterPt: clamp(Number(source.headingAfterPt ?? fallback.headingAfterPt), 0, 36),
    listAfterPt: clamp(Number(source.listAfterPt ?? fallback.listAfterPt), 0, 36),
    quoteAfterPt: clamp(Number(source.quoteAfterPt ?? fallback.quoteAfterPt), 0, 36),
    quoteIndentLeftIn: clamp(
      Number(source.quoteIndentLeftIn ?? fallback.quoteIndentLeftIn),
      0,
      1.5
    ),
    quoteIndentRightIn: clamp(
      Number(source.quoteIndentRightIn ?? fallback.quoteIndentRightIn),
      0,
      1.5
    ),
    codeLineHeight: clamp(Number(source.codeLineHeight ?? fallback.codeLineHeight), 1, 2),
    codeAfterPt: clamp(Number(source.codeAfterPt ?? fallback.codeAfterPt), 0, 36),
    tableFontSizePt: clamp(
      Number(source.tableFontSizePt ?? fallback.tableFontSizePt),
      9,
      18
    ),
    tableAfterPt: clamp(Number(source.tableAfterPt ?? fallback.tableAfterPt), 0, 36),
    imageAfterPt: clamp(Number(source.imageAfterPt ?? fallback.imageAfterPt), 0, 36),
    captionFontSizePt: clamp(
      Number(source.captionFontSizePt ?? fallback.captionFontSizePt),
      8,
      18
    ),
    captionAfterPt: clamp(Number(source.captionAfterPt ?? fallback.captionAfterPt), 0, 36),
    headerFooterFontSizePt: clamp(
      Number(source.headerFooterFontSizePt ?? fallback.headerFooterFontSizePt),
      8,
      18
    ),
    equationAfterPt: clamp(
      Number(source.equationAfterPt ?? fallback.equationAfterPt),
      0,
      36
    ),
    referenceFontSizePt: clamp(
      Number(source.referenceFontSizePt ?? fallback.referenceFontSizePt),
      8,
      18
    ),
    referenceAfterPt: clamp(
      Number(source.referenceAfterPt ?? fallback.referenceAfterPt),
      0,
      36
    ),
    footnoteFontSizePt: clamp(
      Number(source.footnoteFontSizePt ?? fallback.footnoteFontSizePt),
      8,
      18
    ),
    footnoteAfterPt: clamp(
      Number(source.footnoteAfterPt ?? fallback.footnoteAfterPt),
      0,
      36
    ),
    commentAfterPt: clamp(Number(source.commentAfterPt ?? fallback.commentAfterPt), 0, 36),
    titlePage: normalizeTitlePageSpacing(source.titlePage, fallback.titlePage),
  };
};

const normalizeMargins = (
  source: DocumentSettingsInput,
  fallback: DocumentMargins
): DocumentMargins => {
  const margins = isRecord(source.margins)
    ? (source.margins as Partial<DocumentMargins>)
    : {};

  return {
    top: clamp(Number(source.marginTopIn ?? margins.top ?? fallback.top), 0.5, 2),
    bottom: clamp(Number(source.marginBottomIn ?? margins.bottom ?? fallback.bottom), 0.5, 2),
    left: clamp(Number(source.marginLeftIn ?? margins.left ?? fallback.left), 0.5, 2),
    right: clamp(Number(source.marginRightIn ?? margins.right ?? fallback.right), 0.5, 2),
    unit: "in",
  };
};

const normalizePage = (
  value: unknown,
  fallback: DocumentPageSettings
): DocumentPageSettings => {
  const source = isRecord(value) ? value : {};

  return {
    size: "A4",
    widthMm: clamp(Number(source.widthMm ?? fallback.widthMm), 150, 300),
    heightMm: clamp(Number(source.heightMm ?? fallback.heightMm), 200, 400),
  };
};

const normalizePageBreakRules = (
  source: DocumentSettingsInput,
  fallback: DocumentPageBreakRules
): DocumentPageBreakRules => {
  const rules = isRecord(source.pageBreakRules)
    ? (source.pageBreakRules as Partial<DocumentPageBreakRules>)
    : {};

  return {
    heading1StartsNewPage:
      typeof source.pageBreakAfterHeading1 === "boolean"
        ? source.pageBreakAfterHeading1
        : typeof rules.heading1StartsNewPage === "boolean"
          ? rules.heading1StartsNewPage
          : fallback.heading1StartsNewPage,
  };
};

const buildDefaultDocumentSettings = (): DocumentStyleSettings => {
  const sharedDefaults = cloneObject(sharedDocumentSettings as Record<string, unknown>);
  const headingSizes = isRecord(sharedDefaults.headingSizes)
    ? (sharedDefaults.headingSizes as Partial<DocumentStyleSettings["headingSizes"]>)
    : {};
  const margins = isRecord(sharedDefaults.margins)
    ? (sharedDefaults.margins as Partial<DocumentMargins>)
    : {};
  const pageBreakRules = normalizePageBreakRules(
    sharedDefaults as DocumentSettingsInput,
    { heading1StartsNewPage: true }
  );

  return {
    fontFamily:
      sanitizeFontName(String(sharedDefaults.fontFamily ?? "Times New Roman")) ||
      "Times New Roman",
    bodyFontSize: clamp(Number(sharedDefaults.bodyFontSize ?? 12), 10, 16),
    headingSizes: {
      title: clamp(Number(headingSizes.title ?? 22), 18, 34),
      h1: clamp(Number(headingSizes.h1 ?? 18), 14, 28),
      h2: clamp(Number(headingSizes.h2 ?? 16), 13, 24),
      h3: clamp(Number(headingSizes.h3 ?? 14), 12, 20),
    },
    paragraphAlign:
      sharedDefaults.paragraphAlign === "left" ||
      sharedDefaults.paragraphAlign === "right" ||
      sharedDefaults.paragraphAlign === "center" ||
      sharedDefaults.paragraphAlign === "justify"
        ? sharedDefaults.paragraphAlign
        : "justify",
    lineSpacing: clamp(Number(sharedDefaults.lineSpacing ?? 1.5), 1, 2),
    margins: {
      top: clamp(Number(margins.top ?? 1), 0.5, 2),
      bottom: clamp(Number(margins.bottom ?? 1), 0.5, 2),
      left: clamp(Number(margins.left ?? 1), 0.5, 2),
      right: clamp(Number(margins.right ?? 1), 0.5, 2),
      unit: "in",
    },
    page: normalizePage(sharedDefaults.page, {
      size: "A4",
      widthMm: 210,
      heightMm: 297,
    }),
    pageBreakRules,
    spacing: normalizeSpacing(sharedDefaults.spacing, {
      paragraphAfterPt: 8,
      headingAfterPt: 8,
      listAfterPt: 8,
      quoteAfterPt: 8,
      quoteIndentLeftIn: 0.35,
      quoteIndentRightIn: 0.2,
      codeLineHeight: 1,
      codeAfterPt: 8,
      tableFontSizePt: 11,
      tableAfterPt: 8,
      imageAfterPt: 6,
      captionFontSizePt: 10,
      captionAfterPt: 10,
      headerFooterFontSizePt: 10,
      equationAfterPt: 8,
      referenceFontSizePt: 11,
      referenceAfterPt: 6,
      footnoteFontSizePt: 10,
      footnoteAfterPt: 4,
      commentAfterPt: 6,
      titlePage: {
        logoAfterPt: 14,
        eyebrowFontSizePt: 11,
        eyebrowAfterPt: 10,
        collegeAfterPt: 8,
        titleAfterPt: 10,
        studentAfterPt: 8,
        courseFontSizePt: 11,
        courseAfterPt: 8,
        subtitleFontSizePt: 11,
        subtitleBeforePt: 18,
        subtitleAfterPt: 8,
        noteFontSizePt: 10,
        noteAfterPt: 6,
      },
    }),
    heading1Size: clamp(Number(headingSizes.h1 ?? 18), 14, 28),
    heading2Size: clamp(Number(headingSizes.h2 ?? 16), 13, 24),
    heading3Size: clamp(Number(headingSizes.h3 ?? 14), 12, 20),
    marginTopIn: clamp(Number(margins.top ?? 1), 0.5, 2),
    marginBottomIn: clamp(Number(margins.bottom ?? 1), 0.5, 2),
    marginLeftIn: clamp(Number(margins.left ?? 1), 0.5, 2),
    marginRightIn: clamp(Number(margins.right ?? 1), 0.5, 2),
    pageBreakAfterHeading1: pageBreakRules.heading1StartsNewPage,
  };
};

export const DEFAULT_DOCUMENT_SETTINGS: DocumentStyleSettings =
  buildDefaultDocumentSettings();

export const normalizeFontLibrary = (value: unknown): string[] => {
  const items = Array.isArray(value) ? value : [];
  const normalized = items
    .map((item) => sanitizeFontName(String(item || "")))
    .filter(Boolean);

  const merged = [...normalized, ...DEFAULT_FONT_LIBRARY];
  return Array.from(new Set(merged));
};

export const normalizeDocumentSettings = (
  value: DocumentSettingsInput | null | undefined
): DocumentStyleSettings => {
  const source = isRecord(value) ? (value as DocumentSettingsInput) : {};
  const defaults = DEFAULT_DOCUMENT_SETTINGS;
  const headingSizes = isRecord(source.headingSizes)
    ? (source.headingSizes as Partial<DocumentStyleSettings["headingSizes"]>)
    : {};
  const paragraphAlign =
    source.paragraphAlign === "left" ||
    source.paragraphAlign === "right" ||
    source.paragraphAlign === "center" ||
    source.paragraphAlign === "justify"
      ? source.paragraphAlign
      : defaults.paragraphAlign;
  const normalizedHeadingSizes = {
    title: clamp(
      Number(headingSizes.title ?? defaults.headingSizes.title),
      18,
      34
    ),
    h1: clamp(Number(source.heading1Size ?? headingSizes.h1 ?? defaults.headingSizes.h1), 14, 28),
    h2: clamp(Number(source.heading2Size ?? headingSizes.h2 ?? defaults.headingSizes.h2), 13, 24),
    h3: clamp(Number(source.heading3Size ?? headingSizes.h3 ?? defaults.headingSizes.h3), 12, 20),
  };
  const normalizedMargins = normalizeMargins(source, defaults.margins);
  const normalizedPage = normalizePage(source.page, defaults.page);
  const normalizedPageBreakRules = normalizePageBreakRules(source, defaults.pageBreakRules);
  const normalizedSpacing = normalizeSpacing(source.spacing, defaults.spacing);

  return {
    fontFamily:
      sanitizeFontName(
        String(source.fontFamily ?? defaults.fontFamily)
      ) || defaults.fontFamily,
    bodyFontSize: clamp(
      Number(source.bodyFontSize ?? defaults.bodyFontSize),
      10,
      16
    ),
    headingSizes: normalizedHeadingSizes,
    paragraphAlign,
    lineSpacing: clamp(Number(source.lineSpacing ?? defaults.lineSpacing), 1, 2),
    margins: normalizedMargins,
    page: normalizedPage,
    pageBreakRules: normalizedPageBreakRules,
    spacing: normalizedSpacing,
    heading1Size: normalizedHeadingSizes.h1,
    heading2Size: normalizedHeadingSizes.h2,
    heading3Size: normalizedHeadingSizes.h3,
    marginTopIn: normalizedMargins.top,
    marginBottomIn: normalizedMargins.bottom,
    marginLeftIn: normalizedMargins.left,
    marginRightIn: normalizedMargins.right,
    pageBreakAfterHeading1: normalizedPageBreakRules.heading1StartsNewPage,
  };
};

export const patchDocumentSettings = (
  current: DocumentStyleSettings,
  patch: DocumentSettingsInput
) => {
  const next = isRecord(patch) ? patch : {};
  const titlePagePatch = isRecord(next.spacing?.titlePage)
    ? next.spacing?.titlePage
    : undefined;

  return normalizeDocumentSettings({
    ...current,
    ...next,
    headingSizes: {
      ...current.headingSizes,
      ...(isRecord(next.headingSizes) ? next.headingSizes : {}),
    },
    margins: {
      ...current.margins,
      ...(isRecord(next.margins) ? next.margins : {}),
      unit: "in",
    },
    page: {
      ...current.page,
      ...(isRecord(next.page) ? next.page : {}),
      size: "A4",
    },
    pageBreakRules: {
      ...current.pageBreakRules,
      ...(isRecord(next.pageBreakRules) ? next.pageBreakRules : {}),
    },
    spacing: {
      ...current.spacing,
      ...(isRecord(next.spacing) ? next.spacing : {}),
      titlePage: {
        ...current.spacing.titlePage,
        ...(titlePagePatch ?? {}),
      },
    },
  });
};

export const ptToPx = (value: number) => {
  return value * (96 / 72);
};

export const getHeadingSize = (
  settings: DocumentStyleSettings,
  level: 1 | 2 | 3 | "title"
) => {
  if (level === "title") {
    return settings.headingSizes.title;
  }
  if (level === 1) {
    return settings.headingSizes.h1;
  }
  if (level === 2) {
    return settings.headingSizes.h2;
  }
  return settings.headingSizes.h3;
};

export const getMarginInches = (
  settings: DocumentStyleSettings,
  side: "top" | "right" | "bottom" | "left"
) => {
  return settings.margins[side];
};

export const readFontLibraryFromStorage = () => {
  if (typeof window === "undefined") {
    return DEFAULT_FONT_LIBRARY;
  }

  try {
    const raw = window.localStorage.getItem(FONT_LIBRARY_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FONT_LIBRARY;
    }
    return normalizeFontLibrary(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_FONT_LIBRARY;
  }
};

export const writeFontLibraryToStorage = (fonts: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    FONT_LIBRARY_STORAGE_KEY,
    JSON.stringify(normalizeFontLibrary(fonts))
  );
};
