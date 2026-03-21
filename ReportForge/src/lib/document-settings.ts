import type { DocumentStyleSettings } from "@/types/editor";

export const FONT_LIBRARY_STORAGE_KEY = "reportforge-font-library";

export const DEFAULT_FONT_LIBRARY = [
  "Times New Roman",
  "Cambria",
  "Georgia",
  "Garamond",
  "Arial",
  "Calibri",
];

export const DEFAULT_DOCUMENT_SETTINGS: DocumentStyleSettings = {
  fontFamily: "Times New Roman",
  bodyFontSize: 12,
  heading1Size: 18,
  heading2Size: 16,
  heading3Size: 14,
  paragraphAlign: "justify",
  lineSpacing: 1.5,
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export const sanitizeFontName = (value: string) => {
  return value.replace(/["<>]/g, "").trim();
};

export const normalizeFontLibrary = (value: unknown): string[] => {
  const items = Array.isArray(value) ? value : [];
  const normalized = items
    .map((item) => sanitizeFontName(String(item || "")))
    .filter(Boolean);

  const merged = [...normalized, ...DEFAULT_FONT_LIBRARY];
  return Array.from(new Set(merged));
};

export const normalizeDocumentSettings = (
  value: Partial<DocumentStyleSettings> | null | undefined
): DocumentStyleSettings => {
  const input = value ?? {};
  return {
    fontFamily: sanitizeFontName(input.fontFamily || DEFAULT_DOCUMENT_SETTINGS.fontFamily) || DEFAULT_DOCUMENT_SETTINGS.fontFamily,
    bodyFontSize: clamp(Number(input.bodyFontSize || DEFAULT_DOCUMENT_SETTINGS.bodyFontSize), 10, 16),
    heading1Size: clamp(Number(input.heading1Size || DEFAULT_DOCUMENT_SETTINGS.heading1Size), 14, 28),
    heading2Size: clamp(Number(input.heading2Size || DEFAULT_DOCUMENT_SETTINGS.heading2Size), 13, 24),
    heading3Size: clamp(Number(input.heading3Size || DEFAULT_DOCUMENT_SETTINGS.heading3Size), 12, 20),
    paragraphAlign:
      input.paragraphAlign === "left" ||
      input.paragraphAlign === "right" ||
      input.paragraphAlign === "center" ||
      input.paragraphAlign === "justify"
        ? input.paragraphAlign
        : DEFAULT_DOCUMENT_SETTINGS.paragraphAlign,
    lineSpacing: clamp(Number(input.lineSpacing || DEFAULT_DOCUMENT_SETTINGS.lineSpacing), 1, 2),
  };
};

export const ptToPx = (value: number) => {
  return value * (96 / 72);
};

export const getHeadingSize = (
  settings: DocumentStyleSettings,
  level: 1 | 2 | 3
) => {
  if (level === 1) {
    return settings.heading1Size;
  }
  if (level === 2) {
    return settings.heading2Size;
  }
  return settings.heading3Size;
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
