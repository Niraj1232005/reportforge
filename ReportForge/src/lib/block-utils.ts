import type {
  BlockType,
  DocumentStyleSettings,
  DocumentBlock,
  EditorSnapshot,
  ReportSection,
  ReportImage,
  RichTextBlock,
  TemplateStructure,
} from "@/types/editor";
import {
  DEFAULT_DOCUMENT_SETTINGS,
  getHeadingSize,
  normalizeDocumentSettings,
  ptToPx,
} from "@/lib/document-settings";
import { getA4ContentHeightPx } from "@/lib/document-schema";

export interface OutlineItem {
  blockId: string;
  level: 1 | 2 | 3;
  number: string;
  title: string;
}

export const RICH_TEXT_BLOCK_TYPES: ReadonlyArray<RichTextBlock["type"]> = [
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "header",
  "footer",
  "bullet_list",
  "numbered_list",
  "quote",
];

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const createNodeId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const stripHtml = (value: string) => {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isRichTextType = (type: BlockType): type is RichTextBlock["type"] => {
  return (RICH_TEXT_BLOCK_TYPES as ReadonlyArray<string>).includes(type);
};

export const isRichTextBlock = (block: DocumentBlock): block is RichTextBlock => {
  return isRichTextType(block.type);
};

export const isHeadingBlock = (
  block: DocumentBlock
): block is Extract<RichTextBlock, { type: "heading1" | "heading2" | "heading3" }> => {
  return block.type === "heading1" || block.type === "heading2" || block.type === "heading3";
};

export const normalizeInlineHtml = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return escapeHtml(trimmedValue).replaceAll("\n", "<br />");
};

export const makeRichBlock = (
  type: RichTextBlock["type"],
  html = ""
): RichTextBlock => {
  return {
    id: createNodeId(),
    type,
    html: html || "",
  };
};

export const createBlock = (type: BlockType): DocumentBlock => {
  if (type === "page_break") {
    return {
      id: createNodeId(),
      type,
    };
  }

  if (type === "equation") {
    return {
      id: createNodeId(),
      type,
      latex: String.raw`E = mc^2`,
      label: "Eq.",
    };
  }

  if (type === "reference") {
    return {
      id: createNodeId(),
      type,
      citationKey: "ref1",
      source: "Author, A. (Year). Title.",
    };
  }

  if (type === "footnote") {
    return {
      id: createNodeId(),
      type,
      footnoteKey: "fn1",
      content: "Footnote text.",
    };
  }

  if (type === "table") {
    return {
      id: createNodeId(),
      type,
      rows: [
        ["", ""],
        ["", ""],
      ],
    };
  }

  if (type === "image") {
    return {
      id: createNodeId(),
      type,
      imageId: "",
      caption: "Figure",
      width: 75,
      alignment: "center",
    };
  }

  if (type === "code") {
    return {
      id: createNodeId(),
      type,
      code: "",
    };
  }

  if (type === "bullet_list") {
    return makeRichBlock(type, "<ul><li>List item</li></ul>");
  }

  if (type === "numbered_list") {
    return makeRichBlock(type, "<ol><li>List item</li></ol>");
  }

  if (type === "quote") {
    return makeRichBlock(type, "Quote");
  }

  if (type === "header") {
    return makeRichBlock(type, "Document Header");
  }

  if (type === "footer") {
    return makeRichBlock(type, "Document Footer");
  }

  if (type === "heading1") {
    return makeRichBlock(type, "Heading 1");
  }

  if (type === "heading2") {
    return makeRichBlock(type, "Heading 2");
  }

  if (type === "heading3") {
    return makeRichBlock(type, "Heading 3");
  }

  return makeRichBlock("paragraph", "");
};

export const transformBlockType = (block: DocumentBlock, type: BlockType): DocumentBlock => {
  if (block.type === type) {
    return block;
  }

  if (isRichTextBlock(block) && isRichTextType(type)) {
    return {
      ...block,
      type,
    };
  }

  const replacement = createBlock(type);
  return {
    ...replacement,
    id: block.id,
  };
};

export const templateSectionsToBlocks = (sections: ReportSection[]): DocumentBlock[] => {
  const blocks: DocumentBlock[] = [];

  for (const section of sections) {
    blocks.push(
      makeRichBlock(
        "heading1",
        normalizeInlineHtml(section.title || "Untitled Section")
      )
    );

    if (section.content?.trim()) {
      blocks.push(makeRichBlock("paragraph", normalizeInlineHtml(section.content)));
    } else {
      blocks.push(makeRichBlock("paragraph", ""));
    }

    for (const subsection of section.subsections) {
      blocks.push(
        makeRichBlock(
          "heading2",
          normalizeInlineHtml(subsection.title || "Untitled Subsection")
        )
      );
      blocks.push(makeRichBlock("paragraph", normalizeInlineHtml(subsection.content || "")));
    }
  }

  if (!blocks.length) {
    blocks.push(makeRichBlock("paragraph", ""));
  }

  return blocks;
};

export const structureToBlocks = (structure: TemplateStructure): DocumentBlock[] => {
  const sections = Array.isArray(structure.sections) ? structure.sections : [];
  const blocks: DocumentBlock[] = [];

  for (const section of sections) {
    const heading = typeof section.title === "string" ? section.title : "Untitled Section";
    blocks.push(makeRichBlock("heading1", normalizeInlineHtml(heading)));
    blocks.push(
      makeRichBlock(
        "paragraph",
        typeof section.content === "string" ? normalizeInlineHtml(section.content) : ""
      )
    );

    const subsections = Array.isArray(section.subsections) ? section.subsections : [];
    for (const subsection of subsections) {
      if (typeof subsection === "string") {
        blocks.push(makeRichBlock("heading2", normalizeInlineHtml(subsection)));
        blocks.push(makeRichBlock("paragraph", ""));
      } else if (subsection && typeof subsection === "object") {
        const title =
          typeof subsection.title === "string" ? subsection.title : "Untitled Subsection";
        const content =
          typeof subsection.content === "string" ? subsection.content : "";
        blocks.push(makeRichBlock("heading2", normalizeInlineHtml(title)));
        blocks.push(makeRichBlock("paragraph", normalizeInlineHtml(content)));
      }
    }
  }

  if (!blocks.length) {
    blocks.push(makeRichBlock("paragraph", ""));
  }

  return blocks;
};

export const extractOutline = (blocks: DocumentBlock[]): OutlineItem[] => {
  let h1 = 0;
  let h2 = 0;
  let h3 = 0;
  const items: OutlineItem[] = [];

  for (const block of blocks) {
    if (block.type === "heading1") {
      h1 += 1;
      h2 = 0;
      h3 = 0;
      items.push({
        blockId: block.id,
        level: 1,
        number: `${h1}`,
        title: stripHtml(block.html) || "Untitled Heading",
      });
      continue;
    }

    if (block.type === "heading2") {
      if (h1 === 0) {
        h1 = 1;
      }
      h2 += 1;
      h3 = 0;
      items.push({
        blockId: block.id,
        level: 2,
        number: `${h1}.${h2}`,
        title: stripHtml(block.html) || "Untitled Subheading",
      });
      continue;
    }

    if (block.type === "heading3") {
      if (h1 === 0) {
        h1 = 1;
      }
      if (h2 === 0) {
        h2 = 1;
      }
      h3 += 1;
      items.push({
        blockId: block.id,
        level: 3,
        number: `${h1}.${h2}.${h3}`,
        title: stripHtml(block.html) || "Untitled Subheading",
      });
    }
  }

  return items;
};

export const buildHeadingNumberLookup = (blocks: DocumentBlock[]) => {
  return extractOutline(blocks).reduce<Record<string, string>>((lookup, item) => {
    lookup[item.blockId] = item.number;
    return lookup;
  }, {});
};

export const splitBlocksBySections = (blocks: DocumentBlock[]) => {
  const pages: DocumentBlock[][] = [];
  let currentPage: DocumentBlock[] = [];
  let currentWeight = 0;
  const PAGE_WEIGHT_LIMIT = 48;

  const blockWeight = (block: DocumentBlock) => {
    if (block.type === "heading1") return 5;
    if (block.type === "heading2") return 4;
    if (block.type === "heading3") return 3;
    if (block.type === "table") return 9;
    if (block.type === "image") return 10;
    if (block.type === "code") return 8;
    if (block.type === "equation") return 4;
    if (block.type === "quote") return 4;
    if (block.type === "bullet_list" || block.type === "numbered_list") {
      return Math.max(3, Math.ceil(stripHtml(block.html).split(/\s+/).filter(Boolean).length / 35));
    }
    if (block.type === "paragraph" || block.type === "header" || block.type === "footer") {
      return Math.max(2, Math.ceil(stripHtml(block.html).split(/\s+/).filter(Boolean).length / 45));
    }
    return 1;
  };

  for (const block of blocks) {
    if (block.type === "header" || block.type === "footer" || block.type === "reference" || block.type === "footnote") {
      continue;
    }

    if (block.type === "page_break") {
      if (currentPage.length) {
        pages.push(currentPage);
      }
      currentPage = [];
      currentWeight = 0;
      continue;
    }

    if (block.type === "heading1" && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentWeight = blockWeight(block);
      continue;
    }

    const nextWeight = currentWeight + blockWeight(block);
    if (nextWeight > PAGE_WEIGHT_LIMIT && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentWeight = blockWeight(block);
      continue;
    }

    currentPage.push(block);
    currentWeight = nextWeight;
  }

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages.length ? pages : [[]];
};

/**
 * Estimate block height in pixels for A4 pagination.
 * Matches document-schema line heights and spacing.
 */
function estimateBlockHeightPx(
  block: DocumentBlock,
  settings: DocumentStyleSettings
): number {
  const lineHeight = Math.max(18, Math.round(ptToPx(settings.bodyFontSize) * settings.lineSpacing));
  const paragraphSpacing = Math.max(8, Math.round(ptToPx(settings.bodyFontSize) * 0.45));
  const headingSpacing = Math.max(12, Math.round(ptToPx(settings.bodyFontSize) * 0.75));
  if (block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
    const level = block.type === "heading1" ? 1 : block.type === "heading2" ? 2 : 3;
    return Math.round(ptToPx(getHeadingSize(settings, level)) * 1.4) + headingSpacing;
  }
  if (block.type === "paragraph" || block.type === "header" || block.type === "footer") {
    const text = stripHtml(block.html);
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = words ? Math.max(1, Math.ceil(words / 12)) : 1;
    return lines * lineHeight + paragraphSpacing;
  }
  if (block.type === "bullet_list" || block.type === "numbered_list" || block.type === "quote") {
    const text = stripHtml(block.html);
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = words ? Math.max(1, Math.ceil(words / 12)) : 1;
    return lines * lineHeight + paragraphSpacing;
  }
  if (block.type === "table") {
    const rows = block.rows.length;
    return rows * Math.max(32, Math.round(lineHeight * 1.3)) + paragraphSpacing;
  }
  if (block.type === "image") {
    const widthRatio = Math.max(0.2, Math.min(1, (block.width || 75) / 100));
    return Math.round(180 * widthRatio) + 52 + paragraphSpacing;
  }
  if (block.type === "code") {
    const lines = (block.code || "").split(/\n/).length || 1;
    return Math.min(420, lines * 22) + paragraphSpacing;
  }
  if (block.type === "page_break") {
    return 0;
  }
  if (block.type === "equation" || block.type === "reference" || block.type === "footnote") {
    return 64 + paragraphSpacing;
  }
  return lineHeight + paragraphSpacing;
}

const shouldForcePageBreakBeforeBlock = (
  block: DocumentBlock,
  currentPageLength: number,
  settings: DocumentStyleSettings
) => {
  return (
    block.type === "heading1" &&
    currentPageLength > 0 &&
    settings.pageBreakAfterHeading1
  );
};

/**
 * Split blocks into pages by content height so each page fits A4 content area.
 * Respects explicit page_break blocks.
 */
export const splitBlocksByPageContent = (
  blocks: DocumentBlock[],
  settings: DocumentStyleSettings = DEFAULT_DOCUMENT_SETTINGS
): DocumentBlock[][] => {
  const normalizedSettings = normalizeDocumentSettings(settings);
  const pageContentHeightPx = getA4ContentHeightPx(normalizedSettings);
  const pages: DocumentBlock[][] = [];
  let currentPage: DocumentBlock[] = [];
  let currentHeight = 0;

  for (const block of blocks) {
    if (block.type === "header" || block.type === "footer" || block.type === "reference" || block.type === "footnote") {
      continue;
    }
    if (block.type === "page_break") {
      if (currentPage.length) {
        pages.push(currentPage);
      }
      currentPage = [];
      currentHeight = 0;
      continue;
    }
    if (shouldForcePageBreakBeforeBlock(block, currentPage.length, normalizedSettings)) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    const blockHeight = estimateBlockHeightPx(block, normalizedSettings);
    if (currentHeight + blockHeight > pageContentHeightPx && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [block];
      currentHeight = blockHeight;
    } else {
      currentPage.push(block);
      currentHeight += blockHeight;
    }
  }
  if (currentPage.length) {
    pages.push(currentPage);
  }
  return pages.length ? pages : [[]];
};

export const cloneEditorSnapshot = (snapshot: EditorSnapshot): EditorSnapshot => {
  return {
    blocks: JSON.parse(JSON.stringify(snapshot.blocks)) as EditorSnapshot["blocks"],
    images: JSON.parse(JSON.stringify(snapshot.images)) as EditorSnapshot["images"],
    comments: JSON.parse(JSON.stringify(snapshot.comments)) as EditorSnapshot["comments"],
    titlePage: JSON.parse(JSON.stringify(snapshot.titlePage)) as EditorSnapshot["titlePage"],
    documentSettings: JSON.parse(
      JSON.stringify(snapshot.documentSettings)
    ) as EditorSnapshot["documentSettings"],
    documentStructure: JSON.parse(
      JSON.stringify(snapshot.documentStructure)
    ) as EditorSnapshot["documentStructure"],
    activeBlockId: snapshot.activeBlockId,
  };
};

export const countDocumentWords = (blocks: DocumentBlock[]) => {
  const textChunks: string[] = [];

  for (const block of blocks) {
    if (
      block.type === "paragraph" ||
      block.type === "heading1" ||
      block.type === "heading2" ||
      block.type === "heading3" ||
      block.type === "header" ||
      block.type === "footer" ||
      block.type === "bullet_list" ||
      block.type === "numbered_list" ||
      block.type === "quote"
    ) {
      textChunks.push(stripHtml(block.html));
      continue;
    }

    if (block.type === "code") {
      textChunks.push(block.code);
      continue;
    }

    if (block.type === "table") {
      for (const row of block.rows) {
        textChunks.push(row.join(" "));
      }
      continue;
    }

    if (block.type === "image") {
      textChunks.push(block.caption);
      continue;
    }

    if (block.type === "equation") {
      textChunks.push(block.latex, block.label);
      continue;
    }

    if (block.type === "reference") {
      textChunks.push(block.citationKey, block.source);
      continue;
    }

    if (block.type === "footnote") {
      textChunks.push(block.footnoteKey, block.content);
    }
  }

  const combined = textChunks.join(" ").trim();
  if (!combined) {
    return 0;
  }

  return combined.split(/\s+/).filter(Boolean).length;
};

export const estimateReadingMinutes = (wordCount: number, wordsPerMinute = 200) => {
  if (wordCount <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

export const parseCitationTokens = (value: string) => {
  return Array.from(value.matchAll(/\[@([a-zA-Z0-9_-]+)\]/g)).map((match) => match[1]);
};

export const parseFootnoteTokens = (value: string) => {
  return Array.from(value.matchAll(/\[fn:([a-zA-Z0-9_-]+)\]/g)).map((match) => match[1]);
};

export const toImageDataUrl = (image: Pick<ReportImage, "mimeType" | "dataBase64"> | null) => {
  if (!image || !image.mimeType || !image.dataBase64) {
    return "";
  }

  return `data:${image.mimeType};base64,${image.dataBase64}`;
};

export const templateNameToId = (name: string) => {
  const slug = slugify(name || "template");
  return slug || createNodeId();
};
