
"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Download, PanelLeftClose, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import BlockEditor from "@/components/BlockEditor";
import OutlinePanel from "@/components/OutlinePanel";
import PreviewPane from "@/components/PreviewPane";
import { createBlock, createNodeId, extractOutline, templateSectionsToBlocks } from "@/lib/block-utils";
import { documentBlocksToBackend } from "@/lib/blocks-to-backend";
import { DEFAULT_DOCUMENT_STRUCTURE_SETTINGS, normalizeDocumentStructureSettings } from "@/lib/document-config";
import { DEFAULT_DOCUMENT_SETTINGS, DEFAULT_FONT_LIBRARY, normalizeDocumentSettings, normalizeFontLibrary, readFontLibraryFromStorage } from "@/lib/document-settings";
import { fetchTemplateByIdFromSource } from "@/lib/template-service";
import type { DocumentBlock, DocumentStructureSettings, DocumentStyleSettings, ReportComment, ReportImage } from "@/types/editor";

type TitlePageState = {
  collegeName: string;
  studentName: string;
  courseName: string;
  logoDataUrl: string;
  eyebrow: string;
  subtitle: string;
  note: string;
  headerText: string;
  footerText: string;
};

const TITLE_PAGE_LOGO_ID = "title-page-logo";
const DEFAULT_TITLE_PAGE: TitlePageState = {
  collegeName: "College Name",
  studentName: "Student Name",
  courseName: "",
  logoDataUrl: "",
  eyebrow: "",
  subtitle: "",
  note: "",
  headerText: "",
  footerText: "",
};

function dataUrlToReportImage(dataUrl: string, id: string): ReportImage {
  const [header, base64] = dataUrl.split(",", 2);
  const mimeMatch = header.match(/data:([^;]+);/);
  return { id, name: "Logo", mimeType: mimeMatch ? mimeMatch[1].trim() : "image/png", dataBase64: base64 || "" };
}

const readImageFile = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return reject(new Error("Expected a base64 data URL."));
      resolve(result.includes(",") ? result.split(",", 2)[1] ?? "" : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });

const ResizeHandle = () => (
  <Separator className="group relative mx-2 hidden w-2 shrink-0 xl:block">
    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition group-hover:bg-blue-300 dark:bg-slate-800 dark:group-hover:bg-blue-700" />
    <div className="absolute left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-500 dark:bg-slate-700 dark:group-hover:bg-blue-600" />
  </Separator>
);

export default function EditorPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = Array.isArray(params?.templateId) ? params.templateId[0] : params?.templateId;
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("Report");
  const [titlePage, setTitlePage] = useState<TitlePageState>(DEFAULT_TITLE_PAGE);
  const [documentSettings, setDocumentSettings] = useState<DocumentStyleSettings>(DEFAULT_DOCUMENT_SETTINGS);
  const [documentStructure, setDocumentStructure] = useState<DocumentStructureSettings>(DEFAULT_DOCUMENT_STRUCTURE_SETTINGS);
  const [fontFamilies, setFontFamilies] = useState<string[]>(DEFAULT_FONT_LIBRARY);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [images, setImages] = useState<Record<string, ReportImage>>({});
  const [commentsByBlock] = useState<Record<string, ReportComment[]>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(true);
  const storageKey = useMemo(() => `reportforge-doc:${templateId || "default"}`, [templateId]);
  const outline = useMemo(() => extractOutline(blocks), [blocks]);
  const citationKeys = useMemo(() => blocks.filter((b) => b.type === "reference").map((b) => b.citationKey).filter(Boolean), [blocks]);
  const footnoteKeys = useMemo(() => blocks.filter((b) => b.type === "footnote").map((b) => b.footnoteKey).filter(Boolean), [blocks]);
  const titlePageForPreview = useMemo(() => ({ collegeName: titlePage.collegeName, studentName: titlePage.studentName, course: titlePage.courseName, logoImageId: titlePage.logoDataUrl ? TITLE_PAGE_LOGO_ID : undefined, logoWidth: 40, eyebrow: titlePage.eyebrow, subtitle: titlePage.subtitle, note: titlePage.note, headerText: titlePage.headerText, footerText: titlePage.footerText }), [titlePage]);
  const imagesWithLogo = useMemo(() => (titlePage.logoDataUrl ? { ...images, [TITLE_PAGE_LOGO_ID]: dataUrlToReportImage(titlePage.logoDataUrl, TITLE_PAGE_LOGO_ID) } : images), [images, titlePage.logoDataUrl]);

  const scrollToBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      const element = editorPanelRef.current?.querySelector(`[data-block-id="${blockId}"]`);
      (element as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!templateId) return;
      setIsLoading(true);
      try {
        const template = await fetchTemplateByIdFromSource(templateId);
        if (!template || cancelled) return;
        let nextTitle = template.name;
        let nextTitlePage = { ...DEFAULT_TITLE_PAGE, eyebrow: template.coverTemplate?.eyebrow || "", subtitle: template.coverTemplate?.subtitle || "", note: template.coverTemplate?.note || "" };
        let nextBlocks = templateSectionsToBlocks(template.sections);
        let nextImages: Record<string, ReportImage> = {};
        let nextDocumentSettings = normalizeDocumentSettings(template.style ?? DEFAULT_DOCUMENT_SETTINGS);
        let nextDocumentStructure = DEFAULT_DOCUMENT_STRUCTURE_SETTINGS;
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as { title?: string; titlePage?: Partial<TitlePageState>; blocks?: DocumentBlock[]; images?: Record<string, ReportImage>; documentSettings?: Partial<DocumentStyleSettings>; documentStructure?: Partial<DocumentStructureSettings>; compactMode?: boolean; collapsedBlockIds?: string[]; };
            if (parsed.title) nextTitle = parsed.title;
            if (parsed.titlePage) nextTitlePage = { ...nextTitlePage, ...parsed.titlePage };
            if (parsed.blocks?.length) nextBlocks = parsed.blocks;
            if (parsed.images) nextImages = parsed.images;
            if (parsed.documentSettings) nextDocumentSettings = normalizeDocumentSettings(parsed.documentSettings);
            if (parsed.documentStructure) nextDocumentStructure = normalizeDocumentStructureSettings(parsed.documentStructure);
            setCompactMode(Boolean(parsed.compactMode));
            setCollapsedBlockIds(Array.isArray(parsed.collapsedBlockIds) ? parsed.collapsedBlockIds : []);
          } catch {}
        }
        setDocumentTitle(nextTitle);
        setTitlePage(nextTitlePage);
        setBlocks(nextBlocks);
        setImages(nextImages);
        setDocumentSettings(nextDocumentSettings);
        setDocumentStructure(nextDocumentStructure);
        setFontFamilies(normalizeFontLibrary([...(template.fonts ?? []), ...readFontLibraryFromStorage()]));
        setActiveBlockId(nextBlocks[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load template.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [storageKey, templateId]);

  useEffect(() => {
    if (isLoading) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({ title: documentTitle, titlePage, blocks, images, documentSettings, documentStructure, compactMode, collapsedBlockIds }));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [blocks, collapsedBlockIds, compactMode, documentSettings, documentStructure, documentTitle, images, isLoading, storageKey, titlePage]);
  const setActiveAndScroll = useCallback((blockId: string | null) => {
    setActiveBlockId(blockId);
    if (blockId) scrollToBlock(blockId);
  }, [scrollToBlock]);

  const handleExportDocx = useCallback(async () => {
    setIsExporting(true);
    setActionError(null);
    try {
      const { blocks: backendBlocks, images: imageLookup } = documentBlocksToBackend(blocks, images, titlePage);
      const response = await fetch(`${backendBaseUrl}/generate-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: documentTitle || "Report", blocks: backendBlocks, images: imageLookup, titlePage: { collegeName: titlePage.collegeName, studentName: titlePage.studentName, course: titlePage.courseName || undefined, logoDataUrl: titlePage.logoDataUrl || undefined, logoWidth: 40, eyebrow: titlePage.eyebrow || undefined, subtitle: titlePage.subtitle || undefined, note: titlePage.note || undefined, headerText: titlePage.headerText || undefined, footerText: titlePage.footerText || undefined }, documentSettings, documentStructure }),
      });
      if (!response.ok) throw new Error("Export DOCX failed.");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${(documentTitle || "report").replace(/\s+/g, "_")}.docx`;
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Export DOCX failed.");
    } finally {
      setIsExporting(false);
    }
  }, [backendBaseUrl, blocks, documentSettings, documentStructure, documentTitle, images, titlePage]);

  const updateBlocks = (updater: (previous: DocumentBlock[]) => DocumentBlock[]) => setBlocks(updater);
  const handleInsertBlockAfter = useCallback((afterId: string | null, type: DocumentBlock["type"]) => {
    const newBlock = createBlock(type);
    updateBlocks((previous) => {
      if (!afterId) return [newBlock, ...previous];
      const index = previous.findIndex((block) => block.id === afterId);
      if (index === -1) return [...previous, newBlock];
      const next = [...previous];
      next.splice(index + 1, 0, newBlock);
      return next;
    });
    setActiveBlockId(newBlock.id);
  }, []);
  const handleDuplicateBlock = useCallback((blockId: string) => {
    updateBlocks((previous) => {
      const index = previous.findIndex((block) => block.id === blockId);
      if (index === -1) return previous;
      const duplicate = JSON.parse(JSON.stringify(previous[index])) as DocumentBlock;
      duplicate.id = createNodeId();
      const next = [...previous];
      next.splice(index + 1, 0, duplicate);
      setActiveBlockId(duplicate.id);
      return next;
    });
  }, []);
  const handleToggleBlockCollapse = useCallback((blockId: string) => setCollapsedBlockIds((current) => current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId]), []);
  const handleReorderBlocks = useCallback((from: number, to: number) => updateBlocks((previous) => { if (from === to || from < 0 || to < 0 || from >= previous.length || to >= previous.length) return previous; const next = [...previous]; const [removed] = next.splice(from, 1); next.splice(to, 0, removed); return next; }), []);
  const handleDeleteBlock = useCallback((blockId: string) => { updateBlocks((previous) => previous.filter((block) => block.id !== blockId)); setCollapsedBlockIds((current) => current.filter((id) => id !== blockId)); if (activeBlockId === blockId) setActiveBlockId(null); }, [activeBlockId]);
  const handleTransformBlock = useCallback((blockId: string, type: DocumentBlock["type"]) => updateBlocks((previous) => previous.map((block) => { if (block.id !== blockId) return block; const next = createBlock(type); if ("html" in block && "html" in next) (next as { html: string }).html = block.html; return { ...next, id: block.id }; })), []);
  const handleUpdateRichBlock = useCallback((blockId: string, html: string) => startTransition(() => updateBlocks((previous) => previous.map((block) => block.id === blockId && "html" in block ? { ...block, html } : block))), []);
  const handleUpdateCodeBlock = useCallback((blockId: string, code: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "code" ? { ...block, code } : block)), []);
  const handleUpdateEquationBlock = useCallback((blockId: string, latex: string, label: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "equation" ? { ...block, latex, label } : block)), []);
  const handleUpdateReferenceBlock = useCallback((blockId: string, citationKey: string, source: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "reference" ? { ...block, citationKey, source } : block)), []);
  const handleUpdateFootnoteBlock = useCallback((blockId: string, footnoteKey: string, content: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "footnote" ? { ...block, footnoteKey, content } : block)), []);
  const handleUpdateTableCell = useCallback((blockId: string, rowIndex: number, colIndex: number, value: string) => updateBlocks((previous) => previous.map((block) => { if (block.id !== blockId || block.type !== "table") return block; return { ...block, rows: block.rows.map((row, r) => r === rowIndex ? row.map((cell, c) => c === colIndex ? value : cell) : row) }; })), []);
  const handleAddTableRow = useCallback((blockId: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "table" ? { ...block, rows: [...block.rows, Array(block.rows[0]?.length ?? 2).fill("")] } : block)), []);
  const handleAddTableColumn = useCallback((blockId: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "table" ? { ...block, rows: block.rows.map((row) => [...row, ""]) } : block)), []);
  const handleDeleteTableRow = useCallback((blockId: string, rowIndex: number) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "table" ? { ...block, rows: block.rows.filter((_, index) => index !== rowIndex) || [["", ""]] } : block)), []);
  const handleDeleteTableColumn = useCallback((blockId: string, colIndex: number) => updateBlocks((previous) => previous.map((block) => { if (block.id !== blockId || block.type !== "table") return block; const rows = block.rows.map((row) => row.filter((_, index) => index !== colIndex)); return { ...block, rows: rows.every((row) => row.length === 0) ? [["", ""]] : rows }; })), []);
  const handleAttachImageToBlock = useCallback(async (blockId: string, file: File) => { const id = createNodeId(); const base64 = await readImageFile(file); setImages((previous) => ({ ...previous, [id]: { id, name: file.name, mimeType: file.type || "image/png", dataBase64: base64 } })); updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "image" ? { ...block, imageId: id } : block)); }, []);
  const handleInsertImageAfter = useCallback(async (afterBlockId: string | null, file: File) => { const imageId = createNodeId(); const base64 = await readImageFile(file); setImages((previous) => ({ ...previous, [imageId]: { id: imageId, name: file.name, mimeType: file.type || "image/png", dataBase64: base64 } })); const newBlock: DocumentBlock = { id: createNodeId(), type: "image", imageId, caption: "Figure", width: 75, alignment: "center" }; updateBlocks((previous) => { if (!afterBlockId) return [newBlock, ...previous]; const index = previous.findIndex((block) => block.id === afterBlockId); if (index === -1) return [...previous, newBlock]; const next = [...previous]; next.splice(index + 1, 0, newBlock); return next; }); setActiveBlockId(newBlock.id); }, []);
  const handleUpdateImageWidth = useCallback((blockId: string, width: number) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "image" ? { ...block, width } : block)), []);
  const handleUpdateImageAlignment = useCallback((blockId: string, alignment: "left" | "center" | "right") => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "image" ? { ...block, alignment } : block)), []);
  const handleUpdateImageCaption = useCallback((blockId: string, caption: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "image" ? { ...block, caption } : block)), []);
  const handleClearImageBlock = useCallback((blockId: string) => updateBlocks((previous) => previous.map((block) => block.id === blockId && block.type === "image" ? { ...block, imageId: "" } : block)), []);

  const handleUploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setTitlePage((current) => ({ ...current, logoDataUrl: result }));
      setDocumentStructure((current) => ({ ...current, showCoverPage: true }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  if (isLoading) return <main className="px-4 py-10 md:px-6"><div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">Loading editor...</div></main>;
  if (loadError) return <main className="px-4 py-10 md:px-6"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-950/40"><p className="text-sm font-semibold text-red-800 dark:text-red-300">Unable to open editor</p><p className="mt-2 text-sm text-red-700 dark:text-red-300">{loadError}</p></div></main>;

  const editorNode = <BlockEditor blocks={blocks} images={images} documentSettings={documentSettings} fontFamilies={fontFamilies} commentsByBlock={commentsByBlock} citationKeys={citationKeys} footnoteKeys={footnoteKeys} activeBlockId={activeBlockId} compactMode={compactMode} collapsedBlockIds={collapsedBlockIds} collapsed={false} onToggleCollapse={() => {}} onToggleBlockCollapse={handleToggleBlockCollapse} onSetActiveBlock={setActiveAndScroll} onInsertBlockAfter={handleInsertBlockAfter} onTransformBlock={handleTransformBlock} onDeleteBlock={handleDeleteBlock} onDuplicateBlock={handleDuplicateBlock} onReorderBlocks={handleReorderBlocks} onUpdateRichBlock={handleUpdateRichBlock} onUpdateCodeBlock={handleUpdateCodeBlock} onUpdateTableCell={handleUpdateTableCell} onAddTableRow={handleAddTableRow} onAddTableColumn={handleAddTableColumn} onDeleteTableRow={handleDeleteTableRow} onDeleteTableColumn={handleDeleteTableColumn} onAttachImageToBlock={handleAttachImageToBlock} onInsertImageAfter={handleInsertImageAfter} onUpdateImageWidth={handleUpdateImageWidth} onUpdateImageAlignment={handleUpdateImageAlignment} onUpdateImageCaption={handleUpdateImageCaption} onClearImageBlock={handleClearImageBlock} onUpdateEquationBlock={handleUpdateEquationBlock} onUpdateReferenceBlock={handleUpdateReferenceBlock} onUpdateFootnoteBlock={handleUpdateFootnoteBlock} onAddComment={() => {}} onDeleteComment={() => {}} onToggleCommentResolved={() => {}} />;
  return (
    <>
      <main className="px-4 pb-4 pt-4 md:px-6">
        <div className="mx-auto max-w-[1800px]">
          <section className="flex h-[calc(100vh-5.5rem)] min-h-[720px] flex-col gap-4">
            <header className="surface-card sticky top-0 z-30 overflow-hidden dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/templates" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" />Templates</Link>
                  <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} className="min-w-[260px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950" />
                  <button type="button" onClick={handleExportDocx} disabled={isExporting} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"><Download className="h-4 w-4" />{isExporting ? "Exporting..." : "Export DOCX"}</button>
                </div>
              </div>
              <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.5fr_1.2fr]">
                <div className="flex flex-wrap items-center gap-2">
                  <select value={documentSettings.fontFamily} onChange={(event) => { const nextFont = event.target.value; setDocumentSettings((current) => ({ ...current, fontFamily: nextFont })); setFontFamilies((current) => normalizeFontLibrary([nextFont, ...current])); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">{fontFamilies.map((fontFamily) => <option key={fontFamily} value={fontFamily}>{fontFamily}</option>)}</select>
                  <select value={documentSettings.paragraphAlign} onChange={(event) => setDocumentSettings((current) => ({ ...current, paragraphAlign: event.target.value as DocumentStyleSettings["paragraphAlign"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"><option value="left">Left</option><option value="justify">Justify</option><option value="center">Center</option><option value="right">Right</option></select>
                  <select value={String(documentSettings.lineSpacing)} onChange={(event) => setDocumentSettings((current) => ({ ...current, lineSpacing: Number(event.target.value) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"><option value="1">1.0</option><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="2">2.0</option></select>
                  <button type="button" onClick={() => setCompactMode((current) => !current)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${compactMode ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}>{compactMode ? "Compact Mode On" : "Compact Mode"}</button>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><input type="checkbox" checked={documentStructure.showCoverPage} onChange={(event) => setDocumentStructure((current) => ({ ...current, showCoverPage: event.target.checked }))} />Show Cover</label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><input type="checkbox" checked={documentStructure.showTableOfContents} onChange={(event) => setDocumentStructure((current) => ({ ...current, showTableOfContents: event.target.checked }))} />Show TOC</label>
                  {!documentStructure.showCoverPage ? <button type="button" onClick={() => setDocumentStructure((current) => ({ ...current, showCoverPage: true }))} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"><Sparkles className="h-4 w-4" />Add Cover Page</button> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actionError ? <p className="text-sm font-medium text-red-600 dark:text-red-300">{actionError}</p> : null}</div>
                {documentStructure.showCoverPage ? <div className="grid gap-3 md:grid-cols-2 xl:col-span-2 xl:grid-cols-4"><input value={titlePage.eyebrow} onChange={(event) => setTitlePage((current) => ({ ...current, eyebrow: event.target.value }))} placeholder="Cover label" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.collegeName} onChange={(event) => setTitlePage((current) => ({ ...current, collegeName: event.target.value }))} placeholder="College name" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.studentName} onChange={(event) => setTitlePage((current) => ({ ...current, studentName: event.target.value }))} placeholder="Student name" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><button type="button" onClick={() => logoInputRef.current?.click()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Upload Cover Logo</button><input value={titlePage.courseName} onChange={(event) => setTitlePage((current) => ({ ...current, courseName: event.target.value }))} placeholder="Course" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.subtitle} onChange={(event) => setTitlePage((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Cover subtitle" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.note} onChange={(event) => setTitlePage((current) => ({ ...current, note: event.target.value }))} placeholder="Cover note" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.headerText} onChange={(event) => setTitlePage((current) => ({ ...current, headerText: event.target.value }))} placeholder="Header text" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /><input value={titlePage.footerText} onChange={(event) => setTitlePage((current) => ({ ...current, footerText: event.target.value }))} placeholder="Footer text" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" /></div> : null}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
            </header>
            <div className="min-h-0 flex-1">
              <Group orientation="horizontal" className="h-full">
                <Panel defaultSize={20} minSize={14}><OutlinePanel outline={outline} activeBlockId={activeBlockId} onJumpToBlock={setActiveAndScroll} /></Panel>
                <ResizeHandle />
                <Panel defaultSize={50} minSize={32}><div ref={editorPanelRef} className="h-full min-h-0">{editorNode}</div></Panel>
                <ResizeHandle />
                <Panel defaultSize={30} minSize={22}><PreviewPane blocks={blocks} images={imagesWithLogo} commentsByBlock={commentsByBlock} documentTitle={documentTitle} titlePage={titlePageForPreview} documentSettings={documentSettings} documentStructure={documentStructure} headerText={titlePage.headerText || undefined} footerText={titlePage.footerText || undefined} activeBlockId={activeBlockId} onSetActiveBlock={setActiveAndScroll} onUpdateRichBlock={handleUpdateRichBlock} onUpdateTableCell={handleUpdateTableCell} onToggleFullscreen={() => setIsPreviewFullscreen(true)} onExportDocx={handleExportDocx} /></Panel>
              </Group>
            </div>
          </section>
        </div>
      </main>
      {isPreviewFullscreen ? <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm"><div className="flex h-full"><div className={`relative h-full border-r border-slate-800 bg-slate-950/96 transition-all duration-300 ${isPreviewDrawerOpen ? "w-[28rem] p-4" : "w-14 p-2"}`}><button type="button" onClick={() => setIsPreviewDrawerOpen((current) => !current)} className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800" aria-label={isPreviewDrawerOpen ? "Hide slide editor" : "Show slide editor"}><PanelLeftClose className={`h-4 w-4 transition ${isPreviewDrawerOpen ? "" : "rotate-180"}`} /></button>{isPreviewDrawerOpen ? <div className="h-[calc(100%-3.25rem)] min-h-0">{editorNode}</div> : null}</div><div className="min-h-0 flex-1 p-4"><PreviewPane blocks={blocks} images={imagesWithLogo} commentsByBlock={commentsByBlock} documentTitle={documentTitle} titlePage={titlePageForPreview} documentSettings={documentSettings} documentStructure={documentStructure} headerText={titlePage.headerText || undefined} footerText={titlePage.footerText || undefined} activeBlockId={activeBlockId} fullscreen editorDrawerOpen={isPreviewDrawerOpen} onSetActiveBlock={setActiveAndScroll} onUpdateRichBlock={handleUpdateRichBlock} onUpdateTableCell={handleUpdateTableCell} onToggleFullscreen={() => setIsPreviewFullscreen(false)} onToggleEditorDrawer={() => setIsPreviewDrawerOpen((current) => !current)} onExportDocx={handleExportDocx} /></div></div></div> : null}
    </>
  );
}
