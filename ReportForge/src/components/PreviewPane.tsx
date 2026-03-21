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
import { Download, Maximize2, Minimize2, PanelsLeftRight, ZoomIn, ZoomOut } from "lucide-react";
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
import { normalizeDocumentSettings } from "@/lib/document-settings";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  MARGIN_BOTTOM_PX,
  MARGIN_LEFT_PX,
  MARGIN_RIGHT_PX,
  MARGIN_TOP_PX,
  getBlockFontSizePt,
  getDocumentFontFamily,
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
  onUpdateTableCell?: (blockId: string, rowIndex: number, colIndex: number, value: string) => void;
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
  commentsByBlock,
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
  const [zoom, setZoom] = useState(fullscreen ? 100 : 90);

  const outline = useMemo(() => extractOutline(blocks), [blocks]);
  const headingLookup = useMemo(() => buildHeadingNumberLookup(blocks), [blocks]);
  const pages = useMemo(() => splitBlocksByPageContent(blocks, settings), [blocks, settings]);
  const documentFontFamily = useMemo(() => getDocumentFontFamily(settings), [settings]);

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

  const renderComments = (blockId: string) => {
    const comments = commentsByBlock[blockId] ?? [];
    if (!comments.length) {
      return null;
    }

    return (
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-slate-700">
        <p className="font-semibold text-amber-900">Comments</p>
        <ul className="mt-1 space-y-1">
          {comments.map((comment) => (
            <li key={comment.id} className={comment.resolved ? "opacity-60 line-through" : ""}>
              {comment.author}: {comment.text}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderPageShell = (
    pageNumber: number,
    content: ReactNode,
    options?: { hideHeader?: boolean }
  ) => (
    <article
      className="rf-preview-page mx-auto flex flex-col"
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        transform: `scale(${zoomRatio})`,
        transformOrigin: "top center",
        paddingTop: MARGIN_TOP_PX,
        paddingRight: MARGIN_RIGHT_PX,
        paddingBottom: MARGIN_BOTTOM_PX,
        paddingLeft: MARGIN_LEFT_PX,
        fontFamily: documentFontFamily,
        lineHeight: settings.lineSpacing,
      }}
    >
      <div
        className="mb-6 min-h-5 text-center text-slate-500"
        style={{ fontSize: `${Math.max(settings.bodyFontSize - 2, 10)}pt` }}
      >
        {options?.hideHeader ? "\u00A0" : headerText || "\u00A0"}
      </div>

      <div className="flex-1">{content}</div>

      <div
        className="mt-8 flex items-center justify-between text-slate-500"
        style={{ fontSize: `${Math.max(settings.bodyFontSize - 2, 10)}pt` }}
      >
        <span>{footerText || "\u00A0"}</span>
        <span>Page {pageNumber}</span>
      </div>
    </article>
  );

  const renderTitlePage = (pageNumber: number) => {
    const logoImage = titlePage.logoImageId ? images[titlePage.logoImageId] : null;
    const logoWidth = Math.min(280, Math.max(92, (titlePage.logoWidth || 40) * 4.2));

    return renderPageShell(
      pageNumber,
      <div className="flex h-full flex-col items-center justify-center text-center">
        {logoImage ? (
          <img
            src={toImageDataUrl(logoImage)}
            alt="Institution logo"
            style={{ width: logoWidth, maxWidth: "100%" }}
            className="mb-8 h-auto"
          />
        ) : null}
        {titlePage.eyebrow ? (
          <p
            className="text-slate-600"
            style={{ fontSize: `${Math.max(settings.bodyFontSize - 1, 10)}pt`, fontWeight: 700 }}
          >
            {titlePage.eyebrow}
          </p>
        ) : null}
        <p
          className="mt-3 text-slate-700"
          style={{ fontSize: `${settings.heading3Size}pt`, fontWeight: 700 }}
        >
          {titlePage.collegeName || "College Name"}
        </p>
        <h1
          className="mt-5 text-slate-900"
          style={{
            fontSize: `${settings.heading1Size + 4}pt`,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {documentTitle || "Report"}
        </h1>
        <p className="mt-8 text-slate-700" style={{ fontSize: `${settings.bodyFontSize}pt` }}>
          {titlePage.studentName || "Student Name"}
        </p>
        {titlePage.course ? (
          <p className="mt-2 text-slate-600" style={{ fontSize: `${settings.bodyFontSize - 1}pt` }}>
            {titlePage.course}
          </p>
        ) : null}
        {titlePage.subtitle ? (
          <p
            className="mt-8 max-w-[32rem] text-slate-600"
            style={{ fontSize: `${settings.bodyFontSize - 1}pt` }}
          >
            {titlePage.subtitle}
          </p>
        ) : null}
        {titlePage.note ? (
          <p
            className="mt-3 max-w-[30rem] text-slate-500"
            style={{ fontSize: `${Math.max(settings.bodyFontSize - 2, 10)}pt` }}
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
          className="mb-8 text-center text-slate-900"
          style={{ fontSize: `${settings.heading1Size}pt`, fontWeight: 700 }}
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
                <span className="min-w-8 text-right text-slate-400">{pageNumber + 1}</span>
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
      activeBlockId === block.id ? "ring-2 ring-blue-200 bg-blue-50/50" : "hover:bg-slate-50/70";

    if (block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
      const number = headingLookup[block.id];
      return (
        <div
          key={block.id}
          className={`mb-4 rounded-md px-2 py-1 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="flex items-start gap-2">
            {number ? (
              <span
                className="pt-0.5 font-semibold text-slate-500"
                style={{ fontSize: `${Math.max(settings.bodyFontSize - 1, 10)}pt` }}
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
                fontSize: `${getBlockFontSizePt(settings, block.type)}pt`,
                fontWeight: 700,
                lineHeight: 1.3,
                color: "#0f172a",
              }}
            />
          </div>
          {renderComments(block.id)}
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
          className={`mb-3 rounded-md px-2 py-1 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <EditablePreviewHtml
            blockId={block.id}
            html={block.html || "<p></p>"}
            onFocusBlock={onSetActiveBlock}
            onUpdate={onUpdateRichBlock}
            className={`doc-rich-preview outline-none ${
              block.type === "quote" ? "rounded-lg bg-slate-50 px-4 py-3" : ""
            }`}
            style={{
              fontFamily: documentFontFamily,
              fontSize: `${settings.bodyFontSize}pt`,
              lineHeight: settings.lineSpacing,
              textAlign: settings.paragraphAlign,
            }}
          />
          {renderComments(block.id)}
        </div>
      );
    }

    if (block.type === "code") {
      return (
        <div
          key={block.id}
          className={`mb-3 rounded-md px-2 py-1 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-[12px] leading-6 text-slate-100">
            <code>{block.code || "// Empty code block"}</code>
          </pre>
          {renderComments(block.id)}
        </div>
      );
    }

    if (isTableBlock(block)) {
      return (
        <div
          key={block.id}
          className={`mb-4 rounded-md px-2 py-1 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: `${settings.bodyFontSize - 1}pt` }}>
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
                            onUpdateTableCell?.(block.id, rowIndex, colIndex, event.target.value)
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
          {renderComments(block.id)}
        </div>
      );
    }

    if (block.type === "image") {
      const image = images[block.imageId];
      if (!image) {
        return (
          <div key={block.id} className="mb-4 text-slate-500">
            [Image missing]
          </div>
        );
      }

      return (
        <figure
          key={block.id}
          className={`mb-5 rounded-md px-2 py-2 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
          style={{
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
          <figcaption className="mt-2 italic text-slate-600" style={{ fontSize: `${settings.bodyFontSize - 2}pt` }}>
            {block.caption || image.name}
          </figcaption>
          {renderComments(block.id)}
        </figure>
      );
    }

    if (block.type === "equation") {
      return (
        <div
          key={block.id}
          className={`mb-4 rounded-md px-2 py-1 transition ${activeClass}`}
          data-preview-block-id={block.id}
          onClick={() => onSetActiveBlock?.(block.id)}
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
            <p className="font-mono text-slate-900">{block.latex || "E = mc^2"}</p>
            <p className="mt-1 text-xs text-slate-500">{block.label || "Equation"}</p>
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
      <section>
        {pageBlocks.map(renderDocumentBlock)}
        {isLastPage ? (
          <>
            {blocks.some((block) => block.type === "reference") ? (
              <section className="mt-8 border-t border-slate-300 pt-5">
                <h3
                  className="mb-3 text-slate-900"
                  style={{ fontSize: `${settings.heading3Size}pt`, fontWeight: 700 }}
                >
                  References
                </h3>
                <ol className="list-decimal space-y-2 pl-6 text-slate-700" style={{ fontSize: `${settings.bodyFontSize - 1}pt` }}>
                  {blocks
                    .filter((block) => block.type === "reference")
                    .map((block) => (
                      <li key={`preview-reference-${block.id}`}>
                        {block.source}
                      </li>
                    ))}
                </ol>
              </section>
            ) : null}

            {blocks.some((block) => block.type === "footnote") ? (
              <section className="mt-8 border-t border-slate-300 pt-5">
                <h3
                  className="mb-3 text-slate-900"
                  style={{ fontSize: `${settings.heading3Size}pt`, fontWeight: 700 }}
                >
                  Footnotes
                </h3>
                <ol className="list-decimal space-y-2 pl-6 text-slate-700" style={{ fontSize: `${settings.bodyFontSize - 1}pt` }}>
                  {blocks
                    .filter((block) => block.type === "footnote")
                    .map((block) => (
                      <li key={`preview-footnote-${block.id}`}>
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
    <section className="surface-card flex h-full min-h-0 flex-col overflow-hidden dark:bg-slate-950">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Live Preview
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {fullscreen ? "Fullscreen Document" : "A4 Document View"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {pageCount} page{pageCount === 1 ? "" : "s"} with editable preview
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
                aria-label={fullscreen ? "Exit fullscreen preview" : "Open fullscreen preview"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/90 px-4 py-6 dark:bg-slate-950">
        <div className="space-y-7 pb-6">
          {renderedPages.map((page, index) => (
            <div
              key={`preview-page-${index}`}
              style={{ height: A4_HEIGHT_PX * zoomRatio + 42 }}
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
