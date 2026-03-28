import type { DocumentStructureSettings } from "@/types/editor";

export const DEFAULT_DOCUMENT_STRUCTURE_SETTINGS: DocumentStructureSettings = {
  showCoverPage: false,
  showTableOfContents: true,
};

export const normalizeDocumentStructureSettings = (
  value: Partial<DocumentStructureSettings> | null | undefined
): DocumentStructureSettings => {
  return {
    showCoverPage: Boolean(value?.showCoverPage),
    showTableOfContents: true,
  };
};

export const countStaticDocumentPages = (
  settings: DocumentStructureSettings
) => {
  let total = 0;

  if (settings.showCoverPage) {
    total += 1;
  }

  if (settings.showTableOfContents) {
    total += 1;
  }

  return total;
};
