"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowLeft,
  Clock3,
  Download,
  LogIn,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useAuth } from "@/components/AuthProvider";
import BlockEditor from "@/components/BlockEditor";
import OutlinePanel from "@/components/OutlinePanel";
import PreviewPane from "@/components/PreviewPane";
import { useToast } from "@/components/ToastProvider";
import { mutateUserReports } from "@/hooks/useUserReports";
import { resolveBackendBaseUrl } from "@/lib/backend-url";
import {
  createBlock,
  createNodeId,
  extractOutline,
  templateSectionsToBlocks,
} from "@/lib/block-utils";
import { documentBlocksToBackend } from "@/lib/blocks-to-backend";
import {
  DEFAULT_DOCUMENT_STRUCTURE_SETTINGS,
  normalizeDocumentStructureSettings,
} from "@/lib/document-config";
import {
  buildDraftPayload,
  normalizeDraftData,
  readGuestDraft,
  readUserDraft,
  writeLastEditorPath,
  writeGuestDraft,
  writeUserDraft,
} from "@/lib/editor-storage";
import {
  DEFAULT_DOCUMENT_SETTINGS,
  DEFAULT_FONT_LIBRARY,
  normalizeDocumentSettings,
  normalizeFontLibrary,
  patchDocumentSettings,
  readFontLibraryFromStorage,
} from "@/lib/document-settings";
import { buildEditorRoute, TEMPLATES_ROUTE } from "@/lib/routes";
import { sanitizeRichTextHtml } from "@/lib/sanitize";
import { fetchTemplateByIdFromSource } from "@/lib/template-service";
import { getReportForUser, saveReportForUser } from "@/lib/user-data";
import type {
  DocumentBlock,
  DocumentStructureSettings,
  DocumentStyleSettings,
  EditorDraftData,
  ReportComment,
  ReportImage,
  ReportRecord,
  ReportTemplate,
  UserProfile,
} from "@/types/editor";

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

const ensureDocumentBlocks = (value: unknown): DocumentBlock[] => {
  if (Array.isArray(value) && value.length) {
    return value.filter(Boolean) as DocumentBlock[];
  }

  return [createBlock("paragraph")];
};

const dataUrlToReportImage = (dataUrl: string, id: string): ReportImage => {
  const [header, base64] = dataUrl.split(",", 2);
  const mimeMatch = header.match(/data:([^;]+);/);
  return {
    id,
    name: "Logo",
    mimeType: mimeMatch ? mimeMatch[1].trim() : "image/png",
    dataBase64: base64 || "",
  };
};

const readImageFile = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Expected a base64 data URL."));
        return;
      }
      resolve(result.includes(",") ? result.split(",", 2)[1] ?? "" : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });

const buildInitialTitlePage = (
  template: ReportTemplate,
  profile?: UserProfile | null
): TitlePageState => {
  return {
    ...DEFAULT_TITLE_PAGE,
    eyebrow: template.coverTemplate?.eyebrow || "",
    subtitle: template.coverTemplate?.subtitle || "",
    note: template.coverTemplate?.note || "",
    collegeName: profile?.college_name || DEFAULT_TITLE_PAGE.collegeName,
    studentName: profile?.full_name || DEFAULT_TITLE_PAGE.studentName,
  };
};

const createFallbackDraft = (
  template: ReportTemplate,
  templateId: string,
  profile?: UserProfile | null
): EditorDraftData => {
  return {
    templateId,
    title: template.name,
    titlePage: buildInitialTitlePage(template, profile),
    blocks: ensureDocumentBlocks(templateSectionsToBlocks(template.sections)),
    images: {},
    documentSettings: normalizeDocumentSettings({
      ...DEFAULT_DOCUMENT_SETTINGS,
      ...(template.style ?? {}),
      ...(profile?.default_font ? { fontFamily: profile.default_font } : {}),
    }),
    documentStructure: normalizeDocumentStructureSettings(
      DEFAULT_DOCUMENT_STRUCTURE_SETTINGS
    ),
    compactMode: false,
    collapsedBlockIds: [],
  };
};

const formatSavedTime = (value: string | null) => {
  if (!value) {
    return "Autosave enabled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Autosaved";
  }

  return `Autosaved ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const upsertReportInList = (
  reports: ReportRecord[] | undefined,
  nextReport: ReportRecord,
  aliasIds: string[] = []
) => {
  const current = reports ?? [];
  const allMatchIds = new Set([nextReport.id, ...aliasIds]);
  const withoutMatch = current.filter((report) => !allMatchIds.has(report.id));
  return [nextReport, ...withoutMatch].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  );
};

const ResizeHandle = () => (
  <Separator className="rf-print-hide group relative mx-2 hidden w-2 shrink-0 xl:block">
    <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition group-hover:bg-blue-300 dark:bg-slate-800 dark:group-hover:bg-blue-700" />
    <div className="absolute left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 transition group-hover:bg-blue-500 dark:bg-slate-700 dark:group-hover:bg-blue-600" />
  </Separator>
);

export default function EditorPage() {
  const params = useParams<{ templateId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = Array.isArray(params?.templateId)
    ? params.templateId[0]
    : params?.templateId;
  const reportIdFromUrl = searchParams.get("reportId");
  const { loading: authLoading, openLoginModal, profile, user } = useAuth();
  const { showToast } = useToast();
  const backendBaseUrl = resolveBackendBaseUrl();
  const editorPanelRef = useRef<HTMLDivElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const previousUserIdRef = useRef<string | null>(null);
  const hasHydratedDraftRef = useRef(false);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const currentDraftRef = useRef<EditorDraftData | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [queuedSaveAt, setQueuedSaveAt] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(reportIdFromUrl);
  const [documentTitle, setDocumentTitle] = useState("Report");
  const [titlePage, setTitlePage] = useState<TitlePageState>(DEFAULT_TITLE_PAGE);
  const [documentSettings, setDocumentSettings] = useState<DocumentStyleSettings>(
    DEFAULT_DOCUMENT_SETTINGS
  );
  const [documentStructure, setDocumentStructure] =
    useState<DocumentStructureSettings>(DEFAULT_DOCUMENT_STRUCTURE_SETTINGS);
  const [fontFamilies, setFontFamilies] = useState<string[]>(DEFAULT_FONT_LIBRARY);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [images, setImages] = useState<Record<string, ReportImage>>({});
  const [commentsByBlock] = useState<Record<string, ReportComment[]>>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<string[]>([]);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isPreviewDrawerOpen, setIsPreviewDrawerOpen] = useState(true);

  const outline = useMemo(() => extractOutline(blocks), [blocks]);
  const citationKeys = useMemo(
    () =>
      blocks
        .filter((block) => block.type === "reference")
        .map((block) => block.citationKey)
        .filter(Boolean),
    [blocks]
  );
  const footnoteKeys = useMemo(
    () =>
      blocks
        .filter((block) => block.type === "footnote")
        .map((block) => block.footnoteKey)
        .filter(Boolean),
    [blocks]
  );

  const currentPath = useMemo(() => {
    if (!templateId) {
      return pathname;
    }

    return buildEditorRoute(templateId, reportIdFromUrl);
  }, [pathname, reportIdFromUrl, templateId]);

  const titlePageForPreview = useMemo(
    () => ({
      collegeName: titlePage.collegeName,
      studentName: titlePage.studentName,
      course: titlePage.courseName,
      logoImageId: titlePage.logoDataUrl ? TITLE_PAGE_LOGO_ID : undefined,
      logoWidth: 40,
      eyebrow: titlePage.eyebrow,
      subtitle: titlePage.subtitle,
      note: titlePage.note,
      headerText: titlePage.headerText,
      footerText: titlePage.footerText,
    }),
    [titlePage]
  );

  const imagesWithLogo = useMemo(
    () =>
      titlePage.logoDataUrl
        ? {
            ...images,
            [TITLE_PAGE_LOGO_ID]: dataUrlToReportImage(
              titlePage.logoDataUrl,
              TITLE_PAGE_LOGO_ID
            ),
          }
        : images,
    [images, titlePage.logoDataUrl]
  );

  const draftPayload = useMemo(() => {
    if (!templateId) {
      return null;
    }

    return buildDraftPayload(templateId, {
      templateId,
      title: documentTitle,
      titlePage,
      blocks,
      images,
      documentSettings,
      documentStructure,
      compactMode,
      collapsedBlockIds,
    });
  }, [
    blocks,
    collapsedBlockIds,
    compactMode,
    documentSettings,
    documentStructure,
    documentTitle,
    images,
    templateId,
    titlePage,
  ]);

  const draftSignature = useMemo(
    () => (draftPayload ? JSON.stringify(draftPayload) : ""),
    [draftPayload]
  );

  useEffect(() => {
    currentDraftRef.current = draftPayload;
  }, [draftPayload]);

  useEffect(() => {
    profileRef.current = profile ?? null;
  }, [profile]);

  const scrollToBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      const element = editorPanelRef.current?.querySelector(
        `[data-block-id="${blockId}"]`
      );
      (element as HTMLElement | null)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const setActiveAndScroll = useCallback(
    (blockId: string | null) => {
      setActiveBlockId(blockId);
      if (blockId) {
        scrollToBlock(blockId);
      }
    },
    [scrollToBlock]
  );

  useEffect(() => {
    setActiveReportId(reportIdFromUrl);
  }, [reportIdFromUrl]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!templateId || authLoading) {
        return;
      }

      setIsLoading(true);
      setLoadError(null);
      setActionError(null);

      try {
        const template = await fetchTemplateByIdFromSource(templateId);
        if (!template) {
          throw new Error("Template not found.");
        }

        const fallbackDraft = createFallbackDraft(
          template,
          templateId,
          profileRef.current
        );
        const shouldPreserveCurrentDraft =
          previousUserIdRef.current === null &&
          Boolean(user?.id) &&
          !reportIdFromUrl &&
          hasHydratedDraftRef.current &&
          currentDraftRef.current?.templateId === templateId;
        let nextReportId = reportIdFromUrl;
        let nextDraft = fallbackDraft;
        let nextSavedAt: string | null = null;

        if (user?.id && reportIdFromUrl) {
          const report = await getReportForUser(user.id, reportIdFromUrl);
          if (!report?.content) {
            throw new Error("The selected report could not be loaded.");
          }

          nextDraft = normalizeDraftData(
            templateId,
            report.content,
            fallbackDraft,
            profileRef.current
          );
          nextReportId = report.id;
          nextSavedAt = report.updated_at;
          lastSavedSignatureRef.current = JSON.stringify(
            buildDraftPayload(templateId, nextDraft)
          );
        } else if (shouldPreserveCurrentDraft && currentDraftRef.current) {
          nextDraft = normalizeDraftData(
            templateId,
            currentDraftRef.current,
            fallbackDraft,
            profileRef.current
          );
          lastSavedSignatureRef.current = null;
        } else if (user?.id) {
          const savedDraft = readUserDraft<Partial<EditorDraftData>>(
            user.id,
            templateId
          );
          if (savedDraft) {
            nextDraft = normalizeDraftData(
              templateId,
              savedDraft,
              fallbackDraft,
              profileRef.current
            );
          }
          lastSavedSignatureRef.current = null;
        } else {
          const guestDraft = readGuestDraft<Partial<EditorDraftData>>(templateId);
          if (guestDraft) {
            nextDraft = normalizeDraftData(
              templateId,
              guestDraft,
              fallbackDraft,
              profileRef.current
            );
          }
          nextReportId = null;
          lastSavedSignatureRef.current = null;
        }

        if (cancelled) {
          return;
        }

        hasHydratedDraftRef.current = true;
        previousUserIdRef.current = user?.id ?? null;
        setActiveReportId(nextReportId);
        setLastSavedAt(nextSavedAt);
        setQueuedSaveAt(null);
        setDocumentTitle(nextDraft.title);
        setTitlePage(nextDraft.titlePage);
        setBlocks(ensureDocumentBlocks(nextDraft.blocks));
        setImages(nextDraft.images);
        setDocumentSettings(nextDraft.documentSettings);
        setDocumentStructure(nextDraft.documentStructure);
        setCompactMode(nextDraft.compactMode);
        setCollapsedBlockIds(nextDraft.collapsedBlockIds);
        setFontFamilies(
          normalizeFontLibrary([
            ...(template.fonts ?? []),
            ...readFontLibraryFromStorage(),
          ])
        );
        setActiveBlockId(nextDraft.blocks[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to load template.";
          setLoadError(message);
          showToast({
            title: "Editor loading failed",
            description: message,
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    reportIdFromUrl,
    showToast,
    templateId,
    user?.id,
  ]);

  useEffect(() => {
    if (isLoading || !profile) {
      return;
    }

    setTitlePage((current) => ({
      ...current,
      studentName:
        !current.studentName || current.studentName === DEFAULT_TITLE_PAGE.studentName
          ? profile.full_name || current.studentName
          : current.studentName,
      collegeName:
        !current.collegeName || current.collegeName === DEFAULT_TITLE_PAGE.collegeName
          ? profile.college_name || current.collegeName
          : current.collegeName,
    }));

    if (profile.default_font) {
      setDocumentSettings((current) => {
        if (!current.fontFamily || current.fontFamily === DEFAULT_DOCUMENT_SETTINGS.fontFamily) {
          return patchDocumentSettings(current, {
            fontFamily: profile.default_font,
          });
        }

        return current;
      });
      setFontFamilies((current) =>
        normalizeFontLibrary([profile.default_font, ...current])
      );
    }
  }, [isLoading, profile]);

  useEffect(() => {
    if (isLoading || !draftPayload || !templateId) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (user?.id) {
        writeUserDraft(user.id, templateId, draftPayload);
      } else {
        writeGuestDraft(templateId, draftPayload);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draftPayload, isLoading, templateId, user?.id]);

  useEffect(() => {
    if (isLoading || !draftPayload || !templateId || !user?.id) {
      return;
    }

    if (draftSignature === lastSavedSignatureRef.current) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const optimisticTimestamp = new Date().toISOString();
      const optimisticReportId = activeReportId ?? `draft-${templateId}`;
      const optimisticReport: ReportRecord = {
        id: optimisticReportId,
        user_id: user.id,
        title: draftPayload.title,
        content: draftPayload,
        created_at: optimisticTimestamp,
        updated_at: optimisticTimestamp,
        is_optimistic: true,
      };

      setQueuedSaveAt(optimisticTimestamp);
      void mutateUserReports(
        user.id,
        (current) => upsertReportInList(current, optimisticReport),
        false
      );
      setIsSavingReport(true);
      try {
        const savedReport = await saveReportForUser(
          user.id,
          draftPayload,
          activeReportId
        );
        if (cancelled) {
          return;
        }

        setActiveReportId(savedReport.id);
        setLastSavedAt(savedReport.updated_at);
        setQueuedSaveAt(null);
        lastSavedSignatureRef.current = draftSignature;
        setActionError(null);
        void mutateUserReports(
          user.id,
          (current) =>
            upsertReportInList(current, {
              ...savedReport,
              is_optimistic: false,
            }, [optimisticReportId]),
          false
        );

        if (savedReport.id !== reportIdFromUrl) {
          router.replace(buildEditorRoute(templateId, savedReport.id), {
            scroll: false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setActionError(
            error instanceof Error
              ? error.message
              : "Unable to autosave this report."
          );
          setQueuedSaveAt(null);
          void mutateUserReports(user.id);
        }
      } finally {
        if (!cancelled) {
          setIsSavingReport(false);
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeReportId,
    draftSignature,
    draftPayload,
    isLoading,
    reportIdFromUrl,
    router,
    templateId,
    user?.id,
  ]);

  useEffect(() => {
    if (isLoading || !templateId) {
      return;
    }

    writeLastEditorPath(currentPath, user?.id);
  }, [currentPath, isLoading, templateId, user?.id]);

  const hasQueuedCloudChanges = Boolean(
    user?.id && draftSignature && draftSignature !== lastSavedSignatureRef.current
  );

  const handleExportDocx = useCallback(async () => {
    setIsExporting(true);
    setActionError(null);
    try {
      if (!backendBaseUrl) {
        throw new Error("Export service is not configured for this environment.");
      }

      const safeBlocks = ensureDocumentBlocks(blocks);
      const { blocks: backendBlocks, images: imageLookup } =
        documentBlocksToBackend(safeBlocks, images, titlePage);
      const response = await fetch(`${backendBaseUrl}/generate-doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: documentTitle || "Report",
          blocks: backendBlocks,
          images: imageLookup,
          titlePage: {
            collegeName: titlePage.collegeName,
            studentName: titlePage.studentName,
            course: titlePage.courseName || undefined,
            logoDataUrl: titlePage.logoDataUrl || undefined,
            logoWidth: 40,
            eyebrow: titlePage.eyebrow || undefined,
            subtitle: titlePage.subtitle || undefined,
            note: titlePage.note || undefined,
            headerText: titlePage.headerText || undefined,
            footerText: titlePage.footerText || undefined,
          },
          documentSettings,
          documentStructure,
        }),
      });
      if (!response.ok) {
        throw new Error("Export DOCX failed.");
      }
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
      const message =
        error instanceof Error && /failed to fetch/i.test(error.message)
          ? "Unable to reach the export service. Check the backend connection and try again."
          : error instanceof Error
            ? error.message
            : "Export DOCX failed.";
      setActionError(message);
      showToast({
        title: "Export failed",
        description: message,
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    backendBaseUrl,
    blocks,
    documentSettings,
    documentStructure,
    documentTitle,
    images,
    showToast,
    titlePage,
  ]);

  const updateBlocks = (updater: (previous: DocumentBlock[]) => DocumentBlock[]) =>
    setBlocks(updater);

  const handleInsertBlockAfter = useCallback(
    (afterId: string | null, type: DocumentBlock["type"]) => {
      const newBlock = createBlock(type);
      updateBlocks((previous) => {
        if (!afterId) {
          return [newBlock, ...previous];
        }

        const index = previous.findIndex((block) => block.id === afterId);
        if (index === -1) {
          return [...previous, newBlock];
        }

        const next = [...previous];
        next.splice(index + 1, 0, newBlock);
        return next;
      });
      setActiveBlockId(newBlock.id);
    },
    []
  );

  const handleDuplicateBlock = useCallback((blockId: string) => {
    updateBlocks((previous) => {
      const index = previous.findIndex((block) => block.id === blockId);
      if (index === -1) {
        return previous;
      }
      const duplicate = JSON.parse(JSON.stringify(previous[index])) as DocumentBlock;
      duplicate.id = createNodeId();
      const next = [...previous];
      next.splice(index + 1, 0, duplicate);
      setActiveBlockId(duplicate.id);
      return next;
    });
  }, []);

  const handleToggleBlockCollapse = useCallback(
    (blockId: string) =>
      setCollapsedBlockIds((current) =>
        current.includes(blockId)
          ? current.filter((id) => id !== blockId)
          : [...current, blockId]
      ),
    []
  );

  const handleReorderBlocks = useCallback(
    (from: number, to: number) =>
      updateBlocks((previous) => {
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= previous.length ||
          to >= previous.length
        ) {
          return previous;
        }
        const next = [...previous];
        const [removed] = next.splice(from, 1);
        next.splice(to, 0, removed);
        return next;
      }),
    []
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      updateBlocks((previous) => previous.filter((block) => block.id !== blockId));
      setCollapsedBlockIds((current) => current.filter((id) => id !== blockId));
      if (activeBlockId === blockId) {
        setActiveBlockId(null);
      }
    },
    [activeBlockId]
  );

  const handleTransformBlock = useCallback(
    (blockId: string, type: DocumentBlock["type"]) =>
      updateBlocks((previous) =>
        previous.map((block) => {
          if (block.id !== blockId) {
            return block;
          }
          const next = createBlock(type);
          if ("html" in block && "html" in next) {
            (next as { html: string }).html = block.html;
          }
          return { ...next, id: block.id };
        })
      ),
    []
  );

  const handleUpdateRichBlock = useCallback(
    (blockId: string, html: string) =>
      startTransition(() =>
        updateBlocks((previous) =>
          previous.map((block) =>
            block.id === blockId && "html" in block
              ? { ...block, html: sanitizeRichTextHtml(html) }
              : block
          )
        )
      ),
    []
  );

  const handleUpdateCodeBlock = useCallback(
    (blockId: string, code: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "code"
            ? { ...block, code }
            : block
        )
      ),
    []
  );

  const handleUpdateEquationBlock = useCallback(
    (blockId: string, latex: string, label: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "equation"
            ? { ...block, latex, label }
            : block
        )
      ),
    []
  );

  const handleUpdateReferenceBlock = useCallback(
    (blockId: string, citationKey: string, source: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "reference"
            ? { ...block, citationKey, source }
            : block
        )
      ),
    []
  );

  const handleUpdateFootnoteBlock = useCallback(
    (blockId: string, footnoteKey: string, content: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "footnote"
            ? { ...block, footnoteKey, content }
            : block
        )
      ),
    []
  );

  const handleUpdateTableCell = useCallback(
    (blockId: string, rowIndex: number, colIndex: number, value: string) =>
      updateBlocks((previous) =>
        previous.map((block) => {
          if (block.id !== blockId || block.type !== "table") {
            return block;
          }

          return {
            ...block,
            rows: block.rows.map((row, rowPosition) =>
              rowPosition === rowIndex
                ? row.map((cell, cellPosition) =>
                    cellPosition === colIndex ? value : cell
                  )
                : row
            ),
          };
        })
      ),
    []
  );

  const handleAddTableRow = useCallback(
    (blockId: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "table"
            ? {
                ...block,
                rows: [
                  ...block.rows,
                  Array(block.rows[0]?.length ?? 2).fill(""),
                ],
              }
            : block
        )
      ),
    []
  );

  const handleAddTableColumn = useCallback(
    (blockId: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "table"
            ? { ...block, rows: block.rows.map((row) => [...row, ""]) }
            : block
        )
      ),
    []
  );

  const handleDeleteTableRow = useCallback(
    (blockId: string, rowIndex: number) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "table"
            ? {
                ...block,
                rows:
                  block.rows.filter((_, index) => index !== rowIndex) || [["", ""]],
              }
            : block
        )
      ),
    []
  );

  const handleDeleteTableColumn = useCallback(
    (blockId: string, colIndex: number) =>
      updateBlocks((previous) =>
        previous.map((block) => {
          if (block.id !== blockId || block.type !== "table") {
            return block;
          }
          const rows = block.rows.map((row) =>
            row.filter((_, index) => index !== colIndex)
          );
          return {
            ...block,
            rows: rows.every((row) => row.length === 0) ? [["", ""]] : rows,
          };
        })
      ),
    []
  );

  const handleAttachImageToBlock = useCallback(async (blockId: string, file: File) => {
    const id = createNodeId();
    const base64 = await readImageFile(file);
    setImages((previous) => ({
      ...previous,
      [id]: {
        id,
        name: file.name,
        mimeType: file.type || "image/png",
        dataBase64: base64,
      },
    }));
    updateBlocks((previous) =>
      previous.map((block) =>
        block.id === blockId && block.type === "image"
          ? { ...block, imageId: id }
          : block
      )
    );
  }, []);

  const handleInsertImageAfter = useCallback(
    async (afterBlockId: string | null, file: File) => {
      const imageId = createNodeId();
      const base64 = await readImageFile(file);
      setImages((previous) => ({
        ...previous,
        [imageId]: {
          id: imageId,
          name: file.name,
          mimeType: file.type || "image/png",
          dataBase64: base64,
        },
      }));
      const newBlock: DocumentBlock = {
        id: createNodeId(),
        type: "image",
        imageId,
        caption: "Figure",
        width: 75,
        alignment: "center",
      };
      updateBlocks((previous) => {
        if (!afterBlockId) {
          return [newBlock, ...previous];
        }
        const index = previous.findIndex((block) => block.id === afterBlockId);
        if (index === -1) {
          return [...previous, newBlock];
        }
        const next = [...previous];
        next.splice(index + 1, 0, newBlock);
        return next;
      });
      setActiveBlockId(newBlock.id);
    },
    []
  );

  const handleUpdateImageWidth = useCallback(
    (blockId: string, width: number) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "image"
            ? { ...block, width }
            : block
        )
      ),
    []
  );

  const handleUpdateImageAlignment = useCallback(
    (blockId: string, alignment: "left" | "center" | "right") =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "image"
            ? { ...block, alignment }
            : block
        )
      ),
    []
  );

  const handleUpdateImageCaption = useCallback(
    (blockId: string, caption: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "image"
            ? { ...block, caption }
            : block
        )
      ),
    []
  );

  const handleClearImageBlock = useCallback(
    (blockId: string) =>
      updateBlocks((previous) =>
        previous.map((block) =>
          block.id === blockId && block.type === "image"
            ? { ...block, imageId: "" }
            : block
        )
      ),
    []
  );

  const handleUploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        return;
      }
      setTitlePage((current) => ({ ...current, logoDataUrl: result }));
      setDocumentStructure((current) => ({ ...current, showCoverPage: true }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  if (isLoading || authLoading) {
    return (
      <main className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          Loading editor...
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="px-4 py-10 md:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Unable to open editor
          </p>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{loadError}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Retry
            </button>
            <Link
              href={TEMPLATES_ROUTE}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Back to Templates
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const editorNode = (
    <BlockEditor
      blocks={blocks}
      images={images}
      documentSettings={documentSettings}
      fontFamilies={fontFamilies}
      commentsByBlock={commentsByBlock}
      citationKeys={citationKeys}
      footnoteKeys={footnoteKeys}
      activeBlockId={activeBlockId}
      compactMode={compactMode}
      collapsedBlockIds={collapsedBlockIds}
      collapsed={false}
      onToggleCollapse={() => {}}
      onToggleBlockCollapse={handleToggleBlockCollapse}
      onSetActiveBlock={setActiveAndScroll}
      onInsertBlockAfter={handleInsertBlockAfter}
      onTransformBlock={handleTransformBlock}
      onDeleteBlock={handleDeleteBlock}
      onDuplicateBlock={handleDuplicateBlock}
      onReorderBlocks={handleReorderBlocks}
      onUpdateRichBlock={handleUpdateRichBlock}
      onUpdateCodeBlock={handleUpdateCodeBlock}
      onUpdateTableCell={handleUpdateTableCell}
      onAddTableRow={handleAddTableRow}
      onAddTableColumn={handleAddTableColumn}
      onDeleteTableRow={handleDeleteTableRow}
      onDeleteTableColumn={handleDeleteTableColumn}
      onAttachImageToBlock={handleAttachImageToBlock}
      onInsertImageAfter={handleInsertImageAfter}
      onUpdateImageWidth={handleUpdateImageWidth}
      onUpdateImageAlignment={handleUpdateImageAlignment}
      onUpdateImageCaption={handleUpdateImageCaption}
      onClearImageBlock={handleClearImageBlock}
      onUpdateEquationBlock={handleUpdateEquationBlock}
      onUpdateReferenceBlock={handleUpdateReferenceBlock}
      onUpdateFootnoteBlock={handleUpdateFootnoteBlock}
      onAddComment={() => {}}
      onDeleteComment={() => {}}
      onToggleCommentResolved={() => {}}
    />
  );

  return (
    <>
      <main className="px-4 pb-4 pt-4 md:px-6">
        <div className="mx-auto max-w-[1800px]">
          <section className="flex h-[calc(100vh-5.5rem)] min-h-[720px] flex-col gap-4">
            {!user ? (
              <div className="rf-print-hide rounded-[1.5rem] border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/35">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                      Guest Mode
                    </p>
                    <p className="mt-1 text-sm text-blue-950 dark:text-blue-100">
                      Login to save your work, sync profile settings, and keep report history.
                      Your guest draft stays on this device only.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openLoginModal({
                        mode: "login",
                        redirectTo: currentPath,
                        title: "Login to save your work",
                        message:
                          "Continue with Google, GitHub, or email to sync reports across sessions.",
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <LogIn className="h-4 w-4" />
                    Login to Save
                  </button>
                </div>
              </div>
            ) : null}

            <header className="rf-print-hide surface-card sticky top-0 z-30 overflow-hidden dark:bg-slate-950">
              <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={TEMPLATES_ROUTE}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Templates
                  </Link>
                  <input
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    className="min-w-[260px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={handleExportDocx}
                    disabled={isExporting}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export DOCX"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 px-4 py-4 xl:grid-cols-[1.6fr_1fr]">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={documentSettings.fontFamily}
                    onChange={(event) => {
                      const nextFont = event.target.value;
                      setDocumentSettings((current) =>
                        patchDocumentSettings(current, {
                          fontFamily: nextFont,
                        })
                      );
                      setFontFamilies((current) =>
                        normalizeFontLibrary([nextFont, ...current])
                      );
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {fontFamilies.map((fontFamily) => (
                      <option key={fontFamily} value={fontFamily}>
                        {fontFamily}
                      </option>
                    ))}
                  </select>
                  <select
                    value={documentSettings.paragraphAlign}
                    onChange={(event) =>
                      setDocumentSettings((current) =>
                        patchDocumentSettings(current, {
                          paragraphAlign:
                          event.target.value as DocumentStyleSettings["paragraphAlign"],
                        })
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="left">Left</option>
                    <option value="justify">Justify</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                  <select
                    value={String(documentSettings.lineSpacing)}
                    onChange={(event) =>
                      setDocumentSettings((current) =>
                        patchDocumentSettings(current, {
                          lineSpacing: Number(event.target.value),
                        })
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="1">1.0</option>
                    <option value="1.15">1.15</option>
                    <option value="1.5">1.5</option>
                    <option value="2">2.0</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setCompactMode((current) => !current)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      compactMode
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {compactMode ? "Compact Mode On" : "Compact Mode"}
                  </button>
                  {!documentStructure.showCoverPage ? (
                    <button
                      type="button"
                      onClick={() =>
                        setDocumentStructure((current) => ({
                          ...current,
                          showCoverPage: true,
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      <Sparkles className="h-4 w-4" />
                      Add Cover Page
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setDocumentStructure((current) => ({
                          ...current,
                          showCoverPage: false,
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Remove Cover Page
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <Clock3 className="h-3.5 w-3.5" />
                    {user
                      ? isSavingReport
                        ? "Saving to history..."
                        : hasQueuedCloudChanges
                          ? queuedSaveAt
                            ? "Changes queued for autosave..."
                            : "Autosave standing by..."
                        : formatSavedTime(lastSavedAt)
                      : "Guest draft saved on this device"}
                  </div>
                  {actionError ? (
                    <p className="text-sm font-medium text-red-600 dark:text-red-300">
                      {actionError}
                    </p>
                  ) : null}
                </div>

                {documentStructure.showCoverPage ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:col-span-2 xl:grid-cols-4">
                    <input
                      value={titlePage.eyebrow}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          eyebrow: event.target.value,
                        }))
                      }
                      placeholder="Cover label"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.collegeName}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          collegeName: event.target.value,
                        }))
                      }
                      placeholder="College name"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.studentName}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          studentName: event.target.value,
                        }))
                      }
                      placeholder="Student name"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Upload Cover Logo
                    </button>
                    <input
                      value={titlePage.courseName}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          courseName: event.target.value,
                        }))
                      }
                      placeholder="Course"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.subtitle}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          subtitle: event.target.value,
                        }))
                      }
                      placeholder="Cover subtitle"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.note}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Cover note"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.headerText}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          headerText: event.target.value,
                        }))
                      }
                      placeholder="Header text"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <input
                      value={titlePage.footerText}
                      onChange={(event) =>
                        setTitlePage((current) => ({
                          ...current,
                          footerText: event.target.value,
                        }))
                      }
                      placeholder="Footer text"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                ) : null}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadLogo}
              />
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
              <Group orientation="horizontal" className="h-full">
                <Panel defaultSize={20} minSize={14}>
                  <div className="rf-print-hide h-full min-h-0 overflow-hidden">
                    <OutlinePanel
                      outline={outline}
                      activeBlockId={activeBlockId}
                      onJumpToBlock={setActiveAndScroll}
                    />
                  </div>
                </Panel>
                <ResizeHandle />
                <Panel defaultSize={50} minSize={32}>
                  <div
                    ref={editorPanelRef}
                    className="rf-print-hide h-full min-h-0 overflow-hidden"
                  >
                    {editorNode}
                  </div>
                </Panel>
                <ResizeHandle />
                <Panel defaultSize={30} minSize={22}>
                  <div className="h-full min-h-0 overflow-hidden">
                    <PreviewPane
                      blocks={blocks}
                      images={imagesWithLogo}
                      commentsByBlock={commentsByBlock}
                      documentTitle={documentTitle}
                      titlePage={titlePageForPreview}
                      documentSettings={documentSettings}
                      documentStructure={documentStructure}
                      headerText={titlePage.headerText || undefined}
                      footerText={titlePage.footerText || undefined}
                      activeBlockId={activeBlockId}
                      onSetActiveBlock={setActiveAndScroll}
                      onUpdateRichBlock={handleUpdateRichBlock}
                      onUpdateTableCell={handleUpdateTableCell}
                      onToggleFullscreen={() => setIsPreviewFullscreen(true)}
                      onExportDocx={handleExportDocx}
                    />
                  </div>
                </Panel>
              </Group>
            </div>
          </section>
        </div>
      </main>

      {isPreviewFullscreen ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm">
          <div className="flex h-full">
            <div
              className={`rf-print-hide relative h-full border-r border-slate-800 bg-slate-950/96 transition-all duration-300 ${
                isPreviewDrawerOpen ? "w-[28rem] p-4" : "w-14 p-2"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsPreviewDrawerOpen((current) => !current)}
                className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
                aria-label={
                  isPreviewDrawerOpen
                    ? "Hide slide editor"
                    : "Show slide editor"
                }
              >
                <PanelLeftClose
                  className={`h-4 w-4 transition ${
                    isPreviewDrawerOpen ? "" : "rotate-180"
                  }`}
                />
              </button>
              {isPreviewDrawerOpen ? (
                <div className="h-[calc(100%-3.25rem)] min-h-0 overflow-hidden">
                  {editorNode}
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 p-4">
              <PreviewPane
                blocks={blocks}
                images={imagesWithLogo}
                commentsByBlock={commentsByBlock}
                documentTitle={documentTitle}
                titlePage={titlePageForPreview}
                documentSettings={documentSettings}
                documentStructure={documentStructure}
                headerText={titlePage.headerText || undefined}
                footerText={titlePage.footerText || undefined}
                activeBlockId={activeBlockId}
                fullscreen
                editorDrawerOpen={isPreviewDrawerOpen}
                onSetActiveBlock={setActiveAndScroll}
                onUpdateRichBlock={handleUpdateRichBlock}
                onUpdateTableCell={handleUpdateTableCell}
                onToggleFullscreen={() => setIsPreviewFullscreen(false)}
                onToggleEditorDrawer={() =>
                  setIsPreviewDrawerOpen((current) => !current)
                }
                onExportDocx={handleExportDocx}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
