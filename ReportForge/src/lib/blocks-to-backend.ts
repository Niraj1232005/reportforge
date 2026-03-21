/**
 * Converts DocumentBlock[] and images to the payload shape expected by the backend
 * /generate-doc and /upload-docx endpoints.
 */
import type { DocumentBlock, ReportImage } from "@/types/editor";

const IMAGE_REF_PREFIX = "rf-image://";

export interface TitlePageState {
  collegeName: string;
  studentName: string;
  courseName: string;
  logoDataUrl: string;
  eyebrow?: string;
  subtitle?: string;
  note?: string;
  headerText: string;
  footerText: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface BackendBlock {
  id?: string;
  type: string;
  html?: string;
  code?: string;
  rows?: string[][];
  source?: string;
  caption?: string;
  width?: number;
  alignment?: "left" | "center" | "right";
  latex?: string;
  label?: string;
  citationKey?: string;
  footnoteKey?: string;
  content?: string;
}

export function documentBlocksToBackend(
  blocks: DocumentBlock[],
  images: Record<string, ReportImage>,
  titlePage?: TitlePageState
): { blocks: BackendBlock[]; images: Record<string, { id: string; name: string; mimeType: string; dataBase64: string }> } {
  const result: BackendBlock[] = [];

  if (titlePage?.headerText?.trim()) {
    result.push({
      type: "header",
      html: escapeHtml(titlePage.headerText.trim()),
    });
  }

  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
      result.push({
        id: block.id,
        type: block.type,
        html: block.html || "",
      });
      continue;
    }
    if (block.type === "bullet_list" || block.type === "numbered_list" || block.type === "quote" || block.type === "header" || block.type === "footer") {
      result.push({
        id: block.id,
        type: block.type,
        html: block.html || "",
      });
      continue;
    }
    if (block.type === "code") {
      result.push({
        id: block.id,
        type: "code",
        code: block.code || "",
      });
      continue;
    }
    if (block.type === "table") {
      result.push({
        id: block.id,
        type: "table",
        rows: block.rows.map((row) => [...row]),
      });
      continue;
    }
    if (block.type === "image") {
      const source = block.imageId ? `${IMAGE_REF_PREFIX}${block.imageId}` : "";
      result.push({
        id: block.id,
        type: "image",
        source,
        caption: block.caption || "Figure",
        width: block.width ?? 75,
        alignment: block.alignment ?? "center",
      });
      continue;
    }
    if (block.type === "page_break") {
      result.push({ id: block.id, type: "page_break" });
      continue;
    }
    if (block.type === "equation") {
      result.push({
        id: block.id,
        type: "equation",
        latex: block.latex || "",
        label: block.label || "",
      });
      continue;
    }
    if (block.type === "reference") {
      result.push({
        id: block.id,
        type: "reference",
        citationKey: block.citationKey || "",
        source: block.source || "",
      });
      continue;
    }
    if (block.type === "footnote") {
      result.push({
        id: block.id,
        type: "footnote",
        footnoteKey: block.footnoteKey || "",
        content: block.content || "",
      });
    }
  }

  if (titlePage?.footerText?.trim()) {
    result.push({
      type: "footer",
      html: escapeHtml(titlePage.footerText.trim()),
    });
  }

  if (result.length === 0) {
    result.push({ type: "paragraph", html: "" });
  }

  const imageLookup: Record<string, { id: string; name: string; mimeType: string; dataBase64: string }> = {};
  for (const [id, img] of Object.entries(images)) {
    imageLookup[id] = {
      id: img.id,
      name: img.name,
      mimeType: img.mimeType,
      dataBase64: img.dataBase64,
    };
  }

  return {
    blocks: result,
    images: imageLookup,
  };
}
