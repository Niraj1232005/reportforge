/* eslint-disable @next/next/no-img-element */

"use client";

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  PanelsLeftRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  buildHeadingNumberLookup,
  extractOutline,
  splitBlocksByPageContent,
  stripHtml,
  toImageDataUrl,
} from "@/lib/block-utils";
import {
  countStaticDocumentPages,
  normalizeDocumentStructureSettings,
} from "@/lib/document-config";
import {
  getHeadingSize,
  normalizeDocumentSettings,
  ptToPx,
} from "@/lib/document-settings";
import {
  getBlockFontSizePt,
  getDocumentFontFamily,
  getDocumentLayoutMetrics,
} from "@/lib/document-schema";
import type {
  DocumentBlock,
  DocumentStructureSettings,
  DocumentStyleSettings,
  ReportComment,
  ReportImage,
  TableBlock,
  TitlePageData,
} from "@/types/editor";

interface PreviewPaneProps {
  blocks: DocumentBlock[];
  images: Record<string, ReportImage>;
  commentsByBlock: Record<string, ReportComment[]>;
  documentTitle: string;
  titlePage: TitlePageData;
  documentSettings: DocumentStyleSettings;
  documentStructure: DocumentStructureSettings;
  headerText?: string;
  footerText?: string;
  activeBlockId: string | null;
  fullscreen?: boolean;
  editorDrawerOpen?: boolean;
  onSetActiveBlock?: (blockId: string) => void;
  onUpdateRichBlock?: (blockId: string, html: string) => void;
  onUpdateTableCell?: (
    blockId: string,
    rowIndex: number,
    colIndex: number,
    value: string
  ) => void;
  onToggleFullscreen?: () => void;
  onToggleEditorDrawer?: () => void;
  onExportDocx: () => void;
}

const isTableBlock = (block: DocumentBlock): block is TableBlock => {
  return block.type === "table";
};

function EditablePreviewHtml({
  blockId,
  html,
  className,
  style,
  onFocusBlock,
  onUpdate,
}: {
  blockId: string;
  html: string;
  className: string;
  style?: CSSProperties;
  onFocusBlock?: (blockId: string) => void;
  onUpdate?: (blockId: string, html: string) => void;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) {
      return;
    }

    if (document.activeElement === node) {
      return;
    }

    if (node.innerHTML !== html) {
      node.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={elementRef}
      data-preview-editable={blockId}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onFocus={() => onFocusBlock?.(blockId)}
      onClick={() => onFocusBlock?.(blockId)}
      onInput={(event) =>
        onUpdate?.(blockId, (event.currentTarget as HTMLDivElement).innerHTML)
      }
    />
  );
}

function PreviewPane({
  blocks,
  images,
  commentsByBlock: _commentsByBlock,
  documentTitle,
  titlePage,
  documentSettings,
  documentStructure,
  headerText: headerTextOverride,
  footerText: footerTextOverride,
  activeBlockId,
  fullscreen = false,
  editorDrawerOpen = false,
  onSetActiveBlock,
  onUpdateRichBlock,
  onUpdateTableCell,
  onToggleFullscreen,
  onToggleEditorDrawer,
  onExportDocx,
}: PreviewPaneProps) {
  const settings = useMemo(
    () => normalizeDocumentSettings(documentSettings),
    [documentSettings]
  );
  const structure = useMemo(
    () => normalizeDocumentStructureSettings(documentStructure),
    [documentStructure]
  );
  const layout = useMemo(() => getDocumentLayoutMetrics(settings), [settings]);
  const [zoom, setZoom] = useState(fullscreen ? 100 : 90);
  void _commentsByBlock;

  const contentBlocks = useMemo(
    () =>
      blocks.filter(
        (block) =>
          block.type !== "header" &&
          block.type !== "footer" &&
          block.type !== "reference" &&
          block.type !== "footnote"
      ),
    [blocks]
  );
  const outline = useMemo(() => extractOutline(blocks), [blocks]);
  const headingLookup = useMemo(() => buildHeadingNumberLookup(blocks), [blocks]);
  const pages = useMemo(
    () => splitBlocksByPageContent(contentBlocks, settings),
    [contentBlocks, settings]
  );
  const documentFontFamily = useMemo(
    () => getDocumentFontFamily(settings),
    [settings]
  );

  const headerText = useMemo(() => {
    if (headerTextOverride !== undefined) {
      return headerTextOverride;
    }

    const headerBlock = blocks.find((block) => block.type === "header");
    return headerBlock && "html" in headerBlock ? stripHtml(headerBlock.html) : "";
  }, [blocks, headerTextOverride]);

  const footerText = useMemo(() => {
    if (footerTextOverride !== undefined) {
      return footerTextOverride;
    }

    const footerBlock = blocks.find((block) => block.type === "footer");
    return footerBlock && "html" in footerBlock ? stripHtml(footerBlock.html) : "";
  }, [blocks, footerTextOverride]);

  const staticPages = countStaticDocumentPages(structure);
  const pageCount = pages.length + staticPages;
  const zoomRatio = zoom / 100;
  const blockPageLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    const contentPageOffset = staticPages;

    pages.forEach((pageBlocks, pageIndex) => {
      pageBlocks.forEach((block) => {
        lookup[block.id] = contentPageOffset + pageIndex + 1;
      });
    });

    return lookup;
  }, [pages, staticPages]);

  const previewSurfaceVariables = useMemo<CSSProperties>(
    () =>
      ({
        "--font-document": documentFontFamily,
        "--rf-paragraph-space": `${settings.spacing.paragraphAfterPt}pt`,
        "--rf-list-space": `${settings.spacing.listAfterPt}pt`,
        "--rf-quote-space": `${settings.spacing.quoteAfterPt}pt`,
        "--rf-caption-font-size": `${settings.spacing.captionFontSizePt}pt`,
      }) as CSSProperties,
    [documentFontFamily, settings]
  );

  const renderComments = () => {
    return null;
  };

  const renderPageShell = (
    pageNumber: number,
    content: ReactNode,
    options?: { hideHeader?: boolean }
  ) => (
    <article
      className="rf-preview-page relative mx-auto overflow-hidden bg-white text-slate-900"
      style={{
        width: `${layout.pageWidthMm}mm`,
        minHeight: `${layout.pageHeightMm}mm`,
        height: `${layout.pageHeightMm}mm`,
        transform: `scale(${zoomRatio})`,
        transformOrigin: "top center",
        fontFamily: documentFontFamily,
        lineHeight: settings.lineSpacing,
      }}
    >
      <div
        className="pointer-events-none absolute text-center text-slate-500"
        style={{
          top: Math.max(10, layout.marginsPx.top * 0.28),
          left: layout.marginsPx.left,
          right: layout.marginsPx.right,
          fontSize: `${settings.spacing.headerFooterFontSizePt}pt`,
        }}
      >
        {options?.hideHeader ? "\u00A0" : headerText || "\u00A0"}
      </div>

      <div
        className="absolute overflow-hidden"
        style={{
          top: layout.marginsPx.top,
          left: layout.marginsPx.left,
          width: layout.contentWidthPx,
          height: layout.contentHeightPx,
          ...previewSurfaceVariables,
        }}
      >
        {content}
      </div>

      <div
        className="pointer-events-none absolute flex items-center justify-between text-slate-500"
        style={{
          bottom: Math.max(10, layout.marginsPx.bottom * 0.28),
          left: layout.marginsPx.left,
          right: layout.marginsPx.right,
          fontSize: `${settings.spacing.headerFooterFontSizePt}pt`,
        }}
      >
        <span>{footerText || "\u00A0"}</span>
        <span>Page {pageNumber}</span>
      </div>
    </article>
  );

  const renderTitlePage = (pageNumber: number) => {
    const logoImage = titlePage.logoImageId ? images[titlePage.logoImageId] : null;
    const logoWidthPercent = Math.max(15, Math.min(90, titlePage.logoWidth || 40));
    const logoWidthPx = layout.contentWidthPx * (logoWidthPercent / 100);

    return renderPageShell(
      pageNumber,
      <div className="flex h-full flex-col items-center justify-center text-center">
        {logoImage ? (
          <img
            src={toImageDataUrl(logoImage)}
            alt="Institution logo"
            style={{
              width: logoWidthPx,
              maxWidth: "100%",
              marginBottom: layout.titlePage.logoAfterPx,
            }}
            className="h-auto"
          />
        ) : null}
        {titlePage.eyebrow ? (
          <p
            className="text-slate-600"
            style={{
              fontSize: `${settings.spacing.titlePage.eyebrowFontSizePt}pt`,
              fontWeight: 700,
              marginBottom: layout.titlePage.eyebrowAfterPx,
            }}
          >
            {titlePage.eyebrow}
          </p>
        ) : null}
        <p
          className="text-slate-700"
          style={{
            fontSize: `${getHeadingSize(settings, 3)}pt`,
            fontWeight: 700,
            marginBottom: layout.titlePage.collegeAfterPx,
          }}
        >
          {titlePage.collegeName || "College Name"}
        </p>
        <h1
          className="text-slate-900"
          style={{
            fontSize: `${getHeadingSize(settings, "title")}pt`,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: layout.titlePage.titleAfterPx,
          }}
        >
          {documentTitle || "Report"}
        </h1>
        <p
          className="text-slate-700"
          style={{
            fontSize: `${settings.bodyFontSize}pt`,
            marginBottom: layout.titlePage.studentAfterPx,
          }}
        >
          {titlePage.studentName || "Student Name"}
        </p>
        {titlePage.course ? (
          <p
            className="text-slate-600"
            style={{
              fontSize: `${settings.spacing.titlePage.courseFontSizePt}pt`,
              marginBottom: layout.titlePage.courseAfterPx,
            }}
          >
            {titlePage.course}
          </p>
        ) : null}
        {titlePage.subtitle ? (
          <p
            className="max-w-[32rem] text-slate-600"
            style={{
              fontSize: `${settings.spacing.titlePage.subtitleFontSizePt}pt`,
              marginTop: layout.titlePage.subtitleBeforePx,
              marginBottom: layout.titlePage.subtitleAfterPx,
            }}
          >
            {titlePage.subtitle}
          </p>
        ) : null}
        {titlePage.note ? (
          <p
            className="max-w-[30rem] text-slate-500"
            style={{
              fontSize: `${settings.spacing.titlePage.noteFontSizePt}pt`,
              marginBottom: layout.titlePage.noteAfterPx,
            }}
          >
            {titlePage.note}
          </p>
        ) : null}
      </div>,
      { hideHeader: true }
    );
  };

  const renderTocPage = (pageNumber: number) => {
    return renderPageShell(
      pageNumber,
      <section>
        <h2
          className="text-center text-slate-900"
          style={{
            fontSize: `${getHeadingSize(settings, 1)}pt`,
            fontWeight: 700,
            marginBottom: layout.headingAfterPx,
          }}
        >
          Table of Contents
        </h2>
        <div className="space-y-3">
          {outline.length ? (
            outline.map((item) => (
              <div
                key={item.blockId}
                className="flex items-start justify-between gap-3"
                style={{
                  paddingLeft: item.level === 1 ? 0 : item.level === 2 ? 22 : 38,
                  fontSize: `${settings.bodyFontSize}pt`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onSetActiveBlock?.(item.blockId)}
                  className="text-left text-slate-800 transition hover:text-blue-600"
                >
                  {item.number} {item.title}
                </button>
                <span className="min-w-8 text-right text-slate-400">
                  {blockPageLookup[item.blockId] ?? pageNumber + 1}
                </span>
              </div>
            ))
          ) : (
            <p className="italic text-slate-500">Headings will appear here as you write.</p>
          )}
        </div>
      </section>
    );
  };

  const renderDocumentBlock = (block: DocumentBlock) => {
    const activeClass =
      activeBlockId === block.id
        ? "rounded-md shadow-[0_0_0_2px_rgba(59,130,246,0.28)]"
        : "rounded-md transition hover:shadow-[0_0_0_1px_rgba(148,163,184,0.35)]";

    if (block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
      const number = headingLookup[block.id];
      const headingSizePt = getBlockFontSizePt(settings, block.type);

      return (
        <div
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          style={{ marginBottom: layout.headingAfterPx }}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="flex items-start gap-2">
            {number ? (
              <span
                className="text-slate-900"
                style={{
                  fontSize: `${headingSizePt}pt`,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                {number}
              </span>
            ) : null}
            <EditablePreviewHtml
              blockId={block.id}
              html={block.html || ""}
              onFocusBlock={onSetActiveBlock}
              onUpdate={onUpdateRichBlock}
              className="min-w-0 flex-1 outline-none"
              style={{
                fontSize: `${headingSizePt}pt`,
                fontWeight: 700,
                lineHeight: 1.3,
                color: "#0f172a",
              }}
            />
          </div>
          {renderComments()}
        </div>
      );
    }

    if (
      block.type === "paragraph" ||
      block.type === "bullet_list" ||
      block.type === "numbered_list" ||
      block.type === "quote" ||
      block.type === "header" ||
      block.type === "footer"
    ) {
      return (
        <div
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          style={{
            marginBottom:
              block.type === "quote" ? layout.quoteAfterPx : layout.paragraphAfterPx,
            marginLeft:
              block.type === "quote" ? `${settings.spacing.quoteIndentLeftIn}in` : undefined,
            marginRight:
              block.type === "quote" ? `${settings.spacing.quoteIndentRightIn}in` : undefined,
          }}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <EditablePreviewHtml
            blockId={block.id}
            html={block.html || "<p></p>"}
            onFocusBlock={onSetActiveBlock}
            onUpdate={onUpdateRichBlock}
            className="doc-rich-preview outline-none"
            style={{
              fontFamily: documentFontFamily,
              fontSize: `${settings.bodyFontSize}pt`,
              fontStyle: block.type === "quote" ? "italic" : "normal",
              lineHeight: settings.lineSpacing,
              textAlign: settings.paragraphAlign,
            }}
          />
          {renderComments()}
        </div>
      );
    }

    if (block.type === "code") {
      return (
        <div
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          style={{ marginBottom: layout.codeAfterPx }}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: '"Courier New", monospace',
              fontSize: "10pt",
              lineHeight: settings.spacing.codeLineHeight,
              paddingLeft: `${settings.spacing.quoteIndentLeftIn}in`,
              paddingRight: `${settings.spacing.quoteIndentRightIn + 0.05}in`,
            }}
          >
            <code>{block.code || "// Empty code block"}</code>
          </pre>
          {renderComments()}
        </div>
      );
    }

    if (isTableBlock(block)) {
      return (
        <div
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          style={{ marginBottom: layout.tableAfterPx }}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse"
              style={{ fontSize: `${settings.spacing.tableFontSizePt}pt` }}
            >
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${block.id}-row-${rowIndex}`}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={`${block.id}-cell-${rowIndex}-${colIndex}`}
                        className="border border-slate-400 px-2 py-1.5 align-top"
                      >
                        <input
                          value={cell}
                          onFocus={() => onSetActiveBlock?.(block.id)}
                          onChange={(event) =>
                            onUpdateTableCell?.(
                              block.id,
                              rowIndex,
                              colIndex,
                              event.target.value
                            )
                          }
                          className="w-full bg-transparent text-slate-800 outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderComments()}
        </div>
      );
    }

    if (block.type === "image") {
      const image = images[block.imageId];
      if (!image) {
        return (
          <div
            key={block.id}
            style={{ marginBottom: layout.imageAfterPx + layout.captionAfterPx }}
            className="text-slate-500"
          >
            [Image missing]
          </div>
        );
      }

      return (
        <figure
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
          style={{
            marginBottom: layout.captionAfterPx,
            textAlign:
              block.alignment === "left"
                ? "left"
                : block.alignment === "right"
                  ? "right"
                  : "center",
          }}
        >
          <img
            src={toImageDataUrl(image)}
            alt={block.caption || image.name}
            style={{ width: `${block.width}%` }}
            className={`h-auto max-w-full ${
              block.alignment === "left"
                ? ""
                : block.alignment === "right"
                  ? "ml-auto"
                  : "mx-auto"
            }`}
          />
          <figcaption
            className="italic text-slate-600"
            style={{
              fontSize: `${settings.spacing.captionFontSizePt}pt`,
              marginTop: layout.imageAfterPx,
            }}
          >
            {block.caption || image.name}
          </figcaption>
          {renderComments()}
        </figure>
      );
    }

    if (block.type === "equation") {
      return (
        <div
          key={block.id}
          className={activeClass}
          data-preview-block-id={block.id}
          style={{ marginBottom: layout.equationAfterPx }}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="text-center">
            <p
              className="font-mono text-slate-900"
              style={{ fontSize: `${settings.bodyFontSize}pt`, margin: 0 }}
            >
              {block.latex || "E = mc^2"}
            </p>
            <p
              className="text-slate-500"
              style={{
                fontSize: `${settings.spacing.footnoteFontSizePt}pt`,
                fontStyle: "italic",
                marginTop: ptToPx(4),
              }}
            >
              {block.label || "Equation"}
            </p>
          </div>
        </div>
      );
    }

    if (block.type === "page_break") {
      return (
        <div
          key={block.id}
          className="my-4 border-t border-dashed border-slate-300 pt-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400"
        >
          Manual Page Break
        </div>
      );
    }

    return null;
  };

  const renderedPages: ReactNode[] = [];
  let pageNumber = 1;

  if (structure.showCoverPage) {
    renderedPages.push(renderTitlePage(pageNumber));
    pageNumber += 1;
  }

  if (structure.showTableOfContents) {
    renderedPages.push(renderTocPage(pageNumber));
    pageNumber += 1;
  }

  pages.forEach((pageBlocks, index) => {
    const isLastPage = index === pages.length - 1;
    const content = (
      <section style={{ minHeight: "100%" }}>
        {pageBlocks.map(renderDocumentBlock)}
        {isLastPage ? (
          <>
            {blocks.some((block) => block.type === "reference") ? (
              <section style={{ marginTop: layout.headingAfterPx }}>
                <h3
                  className="text-slate-900"
                  style={{
                    fontSize: `${getHeadingSize(settings, 1)}pt`,
                    fontWeight: 700,
                    marginBottom: layout.headingAfterPx,
                  }}
                >
                  References
                </h3>
                <ol
                  className="list-decimal pl-6 text-slate-700"
                  style={{
                    fontSize: `${settings.spacing.referenceFontSizePt}pt`,
                    lineHeight: settings.lineSpacing,
                  }}
                >
                  {blocks
                    .filter((block) => block.type === "reference")
                    .map((block) => (
                      <li
                        key={`preview-reference-${block.id}`}
                        style={{ marginBottom: layout.referenceAfterPx }}
                      >
                        [{block.citationKey}] {block.source}
                      </li>
                    ))}
                </ol>
              </section>
            ) : null}

            {blocks.some((block) => block.type === "footnote") ? (
              <section style={{ marginTop: layout.headingAfterPx }}>
                <h3
                  className="text-slate-900"
                  style={{
                    fontSize: `${getHeadingSize(settings, 1)}pt`,
                    fontWeight: 700,
                    marginBottom: layout.headingAfterPx,
                  }}
                >
                  Footnotes
                </h3>
                <ol
                  className="list-decimal pl-6 text-slate-700"
                  style={{
                    fontSize: `${settings.spacing.footnoteFontSizePt}pt`,
                    lineHeight: settings.lineSpacing,
                  }}
                >
                  {blocks
                    .filter((block) => block.type === "footnote")
                    .map((block) => (
                      <li
                        key={`preview-footnote-${block.id}`}
                        style={{ marginBottom: layout.footnoteAfterPx }}
                      >
                        {block.content}
                      </li>
                    ))}
                </ol>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    );

    renderedPages.push(renderPageShell(pageNumber, content));
    pageNumber += 1;
  });

  return (
    <section className="rf-preview-print-root surface-card flex h-full min-h-0 flex-col overflow-hidden dark:bg-slate-950">
      <div className="rf-preview-toolbar sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Live Preview
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {fullscreen ? "Fullscreen Document" : "A4 Document View"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {pageCount} page{pageCount === 1 ? "" : "s"} with export-matched layout
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fullscreen && onToggleEditorDrawer ? (
              <button
                type="button"
                onClick={onToggleEditorDrawer}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <PanelsLeftRight className="h-3.5 w-3.5" />
                {editorDrawerOpen ? "Hide Editor" : "Show Editor"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(60, value - 10))}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(140, value + 10))}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {onToggleFullscreen ? (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={
                  fullscreen
                    ? "Exit fullscreen preview"
                    : "Open fullscreen preview"
                }
              >
                {fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onExportDocx}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="rf-preview-stage min-h-0 flex-1 overflow-y-auto bg-slate-100/90 px-4 py-6 dark:bg-slate-950">
        <div className="rf-preview-pages space-y-7 pb-6">
          {renderedPages.map((page, index) => (
            <div
              key={`preview-page-${index}`}
              style={{ height: layout.pageHeightPx * zoomRatio + 42 }}
              className="mx-auto"
            >
              {page}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(PreviewPane);
