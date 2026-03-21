import { DEFAULT_DOCUMENT_SETTINGS, getHeadingSize, ptToPx } from "@/lib/document-settings";
import type { DocumentStyleSettings } from "@/types/editor";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const MM_TO_PX = 96 / 25.4;
export const IN_TO_PX = 96;

export const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX);
export const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * MM_TO_PX);

export const MARGIN_TOP_IN = 1;
export const MARGIN_BOTTOM_IN = 1;
export const MARGIN_LEFT_IN = 1;
export const MARGIN_RIGHT_IN = 1;

export const MARGIN_TOP_PX = Math.round(MARGIN_TOP_IN * IN_TO_PX);
export const MARGIN_BOTTOM_PX = Math.round(MARGIN_BOTTOM_IN * IN_TO_PX);
export const MARGIN_LEFT_PX = Math.round(MARGIN_LEFT_IN * IN_TO_PX);
export const MARGIN_RIGHT_PX = Math.round(MARGIN_RIGHT_IN * IN_TO_PX);

export const A4_CONTENT_WIDTH_PX = A4_WIDTH_PX - MARGIN_LEFT_PX - MARGIN_RIGHT_PX;
export const A4_CONTENT_HEIGHT_PX = A4_HEIGHT_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX;

export const DOCUMENT_FONT_FAMILY = '"Times New Roman", Times, serif';
export const BODY_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.bodyFontSize;
export const TITLE_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.heading1Size;
export const HEADING_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.heading2Size;

export const getDocumentFontFamily = (settings: DocumentStyleSettings) => {
  return settings.fontFamily ? `"${settings.fontFamily}", ${DOCUMENT_FONT_FAMILY}` : DOCUMENT_FONT_FAMILY;
};

export const getBlockFontSizePt = (
  settings: DocumentStyleSettings,
  blockType: "paragraph" | "heading1" | "heading2" | "heading3"
) => {
  if (blockType === "heading1") {
    return getHeadingSize(settings, 1);
  }
  if (blockType === "heading2") {
    return getHeadingSize(settings, 2);
  }
  if (blockType === "heading3") {
    return getHeadingSize(settings, 3);
  }
  return settings.bodyFontSize;
};

export const estimateTextLineHeightPx = (settings: DocumentStyleSettings) => {
  return ptToPx(settings.bodyFontSize) * settings.lineSpacing;
};

export const getHeadingSpacingPx = (settings: DocumentStyleSettings) => {
  return Math.max(12, Math.round(ptToPx(settings.bodyFontSize) * 0.8));
};
