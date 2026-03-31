import {
  DEFAULT_DOCUMENT_SETTINGS,
  getHeadingSize,
  getMarginInches,
  normalizeDocumentSettings,
  ptToPx,
} from "@/lib/document-settings";
import type { DocumentStyleSettings } from "@/types/editor";

export const MM_TO_PX = 96 / 25.4;
export const IN_TO_PX = 96;

export const A4_WIDTH_MM = DEFAULT_DOCUMENT_SETTINGS.page.widthMm;
export const A4_HEIGHT_MM = DEFAULT_DOCUMENT_SETTINGS.page.heightMm;
export const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX);
export const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * MM_TO_PX);

export const BODY_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.bodyFontSize;
export const TITLE_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.headingSizes.title;
export const HEADING_FONT_SIZE_PT = DEFAULT_DOCUMENT_SETTINGS.headingSizes.h2;

export const inchesToPx = (value: number) => {
  return Math.round(value * IN_TO_PX);
};

export const getDocumentFontFamily = (settings: DocumentStyleSettings) => {
  return settings.fontFamily ? `"${settings.fontFamily}", "Times New Roman", Times, serif` : '"Times New Roman", Times, serif';
};

export const getDocumentMarginPx = (
  settings: DocumentStyleSettings,
  side: "top" | "right" | "bottom" | "left"
) => {
  const normalized = normalizeDocumentSettings(settings);
  return inchesToPx(getMarginInches(normalized, side));
};

export const getDocumentPageWidthMm = (settings: DocumentStyleSettings) => {
  return normalizeDocumentSettings(settings).page.widthMm;
};

export const getDocumentPageHeightMm = (settings: DocumentStyleSettings) => {
  return normalizeDocumentSettings(settings).page.heightMm;
};

export const getDocumentPageWidthPx = (settings: DocumentStyleSettings) => {
  return Math.round(getDocumentPageWidthMm(settings) * MM_TO_PX);
};

export const getDocumentPageHeightPx = (settings: DocumentStyleSettings) => {
  return Math.round(getDocumentPageHeightMm(settings) * MM_TO_PX);
};

export const getA4ContentWidthPx = (settings: DocumentStyleSettings) => {
  const normalized = normalizeDocumentSettings(settings);
  return (
    getDocumentPageWidthPx(normalized) -
    getDocumentMarginPx(normalized, "left") -
    getDocumentMarginPx(normalized, "right")
  );
};

export const getA4ContentHeightPx = (settings: DocumentStyleSettings) => {
  const normalized = normalizeDocumentSettings(settings);
  return (
    getDocumentPageHeightPx(normalized) -
    getDocumentMarginPx(normalized, "top") -
    getDocumentMarginPx(normalized, "bottom")
  );
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
  return ptToPx(normalizeDocumentSettings(settings).spacing.headingAfterPt);
};

export const getDocumentLayoutMetrics = (settings: DocumentStyleSettings) => {
  const normalized = normalizeDocumentSettings(settings);
  const marginsPx = {
    top: getDocumentMarginPx(normalized, "top"),
    right: getDocumentMarginPx(normalized, "right"),
    bottom: getDocumentMarginPx(normalized, "bottom"),
    left: getDocumentMarginPx(normalized, "left"),
  };

  return {
    pageWidthMm: normalized.page.widthMm,
    pageHeightMm: normalized.page.heightMm,
    pageWidthPx: getDocumentPageWidthPx(normalized),
    pageHeightPx: getDocumentPageHeightPx(normalized),
    contentWidthPx: getA4ContentWidthPx(normalized),
    contentHeightPx: getA4ContentHeightPx(normalized),
    marginsPx,
    bodyLineHeightPx: estimateTextLineHeightPx(normalized),
    paragraphAfterPx: ptToPx(normalized.spacing.paragraphAfterPt),
    headingAfterPx: ptToPx(normalized.spacing.headingAfterPt),
    listAfterPx: ptToPx(normalized.spacing.listAfterPt),
    quoteAfterPx: ptToPx(normalized.spacing.quoteAfterPt),
    codeAfterPx: ptToPx(normalized.spacing.codeAfterPt),
    tableAfterPx: ptToPx(normalized.spacing.tableAfterPt),
    imageAfterPx: ptToPx(normalized.spacing.imageAfterPt),
    captionAfterPx: ptToPx(normalized.spacing.captionAfterPt),
    equationAfterPx: ptToPx(normalized.spacing.equationAfterPt),
    referenceAfterPx: ptToPx(normalized.spacing.referenceAfterPt),
    footnoteAfterPx: ptToPx(normalized.spacing.footnoteAfterPt),
    commentAfterPx: ptToPx(normalized.spacing.commentAfterPt),
    headerFooterFontSizePt: normalized.spacing.headerFooterFontSizePt,
    captionFontSizePt: normalized.spacing.captionFontSizePt,
    tableFontSizePt: normalized.spacing.tableFontSizePt,
    referenceFontSizePt: normalized.spacing.referenceFontSizePt,
    footnoteFontSizePt: normalized.spacing.footnoteFontSizePt,
    titlePage: {
      logoAfterPx: ptToPx(normalized.spacing.titlePage.logoAfterPt),
      eyebrowFontSizePt: normalized.spacing.titlePage.eyebrowFontSizePt,
      eyebrowAfterPx: ptToPx(normalized.spacing.titlePage.eyebrowAfterPt),
      collegeAfterPx: ptToPx(normalized.spacing.titlePage.collegeAfterPt),
      titleAfterPx: ptToPx(normalized.spacing.titlePage.titleAfterPt),
      studentAfterPx: ptToPx(normalized.spacing.titlePage.studentAfterPt),
      courseFontSizePt: normalized.spacing.titlePage.courseFontSizePt,
      courseAfterPx: ptToPx(normalized.spacing.titlePage.courseAfterPt),
      subtitleFontSizePt: normalized.spacing.titlePage.subtitleFontSizePt,
      subtitleBeforePx: ptToPx(normalized.spacing.titlePage.subtitleBeforePt),
      subtitleAfterPx: ptToPx(normalized.spacing.titlePage.subtitleAfterPt),
      noteFontSizePt: normalized.spacing.titlePage.noteFontSizePt,
      noteAfterPx: ptToPx(normalized.spacing.titlePage.noteAfterPt),
    },
  };
};
