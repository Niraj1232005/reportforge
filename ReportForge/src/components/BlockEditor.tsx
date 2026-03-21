/* eslint-disable @next/next/no-img-element */

"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "framer-motion";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  MessageSquarePlus,
  Plus,
  Quote,
  Table,
  Trash2,
  Underline,
  RectangleHorizontal,
} from "lucide-react";
import { stripHtml } from "@/lib/block-utils";
import { ptToPx } from "@/lib/document-settings";
import type {
  BlockType,
  DocumentBlock,
  DocumentStyleSettings,
  ReportComment,
  ReportImage,
  RichTextBlock,
  TableBlock,
} from "@/types/editor";

interface BlockEditorProps {
  blocks: DocumentBlock[];
  images: Record<string, ReportImage>;
  documentSettings: DocumentStyleSettings;
  fontFamilies: string[];
  commentsByBlock: Record<string, ReportComment[]>;
  citationKeys: string[];
  footnoteKeys: string[];
  activeBlockId: string | null;
  compactMode: boolean;
  collapsedBlockIds: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleBlockCollapse: (blockId: string) => void;
  onSetActiveBlock: (blockId: string | null) => void;
  onInsertBlockAfter: (afterBlockId: string | null, type: BlockType) => void;
  onTransformBlock: (blockId: string, type: BlockType) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  onUpdateRichBlock: (blockId: string, html: string) => void;
  onUpdateCodeBlock: (blockId: string, code: string) => void;
  onUpdateTableCell: (blockId: string, rowIndex: number, colIndex: number, value: string) => void;
  onAddTableRow: (blockId: string) => void;
  onAddTableColumn: (blockId: string) => void;
  onDeleteTableRow: (blockId: string, rowIndex: number) => void;
  onDeleteTableColumn: (blockId: string, colIndex: number) => void;
  onAttachImageToBlock: (blockId: string, file: File) => Promise<void>;
  onInsertImageAfter: (afterBlockId: string | null, file: File) => Promise<void>;
  onUpdateImageWidth: (blockId: string, width: number) => void;
  onUpdateImageAlignment: (blockId: string, alignment: "left" | "center" | "right") => void;
  onUpdateImageCaption: (blockId: string, caption: string) => void;
  onClearImageBlock: (blockId: string) => void;
  onUpdateEquationBlock: (blockId: string, latex: string, label: string) => void;
  onUpdateReferenceBlock: (blockId: string, citationKey: string, source: string) => void;
  onUpdateFootnoteBlock: (blockId: string, footnoteKey: string, content: string) => void;
  onAddComment: (blockId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleCommentResolved: (commentId: string) => void;
}

interface SlashCommand {
  type: BlockType;
  label: string;
  keywords: string;
}

interface ToolbarState {
  blockId: string;
  top: number;
  left: number;
}

interface SlashState {
  blockId: string;
  query: string;
}

/** Slash command menu: Paragraph, Heading 1–3, Bullet/Number List, Table, Image, Page Break */
const SLASH_COMMANDS: ReadonlyArray<SlashCommand> = [
  { type: "paragraph", label: "Paragraph", keywords: "text normal" },
  { type: "heading1", label: "Heading 1", keywords: "section title" },
  { type: "heading2", label: "Heading 2", keywords: "subsection subtitle" },
  { type: "heading3", label: "Heading 3", keywords: "subheading minor" },
  { type: "bullet_list", label: "Bullet List", keywords: "ul bullets list" },
  { type: "numbered_list", label: "Numbered List", keywords: "ol ordered list" },
  { type: "table", label: "Table", keywords: "rows columns grid" },
  { type: "image", label: "Image", keywords: "photo figure" },
  { type: "page_break", label: "Page Break", keywords: "page break new page" },
];

const TOOLBAR_FONT_SIZE_OPTIONS = [
  { label: "12", commandValue: "2" },
  { label: "14", commandValue: "3" },
  { label: "18", commandValue: "4" },
  { label: "24", commandValue: "5" },
];

const isRichTextBlock = (block: DocumentBlock): block is RichTextBlock => {
  return (
    block.type === "paragraph" ||
    block.type === "header" ||
    block.type === "footer" ||
    block.type === "heading1" ||
    block.type === "heading2" ||
    block.type === "heading3" ||
    block.type === "bullet_list" ||
    block.type === "numbered_list" ||
    block.type === "quote"
  );
};

const isTableBlock = (block: DocumentBlock): block is TableBlock => {
  return block.type === "table";
};

const blockLabel = (type: BlockType) => {
  switch (type) {
    case "heading1":
      return "Heading 1";
    case "header":
      return "Header";
    case "footer":
      return "Footer";
    case "heading2":
      return "Heading 2";
    case "heading3":
      return "Heading 3";
    case "bullet_list":
      return "Bullet List";
    case "numbered_list":
      return "Numbered List";
    case "quote":
      return "Quote";
    case "code":
      return "Code";
    case "table":
      return "Table";
    case "image":
      return "Image";
    case "page_break":
      return "Page Break";
    case "equation":
      return "Equation";
    case "reference":
      return "Reference";
    case "footnote":
      return "Footnote";
    default:
      return "Paragraph";
  }
};

const blockIcon = (type: BlockType) => {
  switch (type) {
    case "heading1":
      return <Heading1 className="h-3.5 w-3.5" />;
    case "header":
      return <AlignCenter className="h-3.5 w-3.5" />;
    case "footer":
      return <AlignJustify className="h-3.5 w-3.5" />;
    case "heading2":
      return <Heading2 className="h-3.5 w-3.5" />;
    case "heading3":
      return <Heading3 className="h-3.5 w-3.5" />;
    case "bullet_list":
      return <List className="h-3.5 w-3.5" />;
    case "numbered_list":
      return <ListOrdered className="h-3.5 w-3.5" />;
    case "quote":
      return <Quote className="h-3.5 w-3.5" />;
    case "code":
      return <Code className="h-3.5 w-3.5" />;
    case "table":
      return <Table className="h-3.5 w-3.5" />;
    case "image":
      return <ImagePlus className="h-3.5 w-3.5" />;
    case "page_break":
      return <RectangleHorizontal className="h-3.5 w-3.5" />;
    case "equation":
      return <Code className="h-3.5 w-3.5" />;
    case "reference":
      return <Quote className="h-3.5 w-3.5" />;
    case "footnote":
      return <MessageSquarePlus className="h-3.5 w-3.5" />;
    default:
      return <Plus className="h-3.5 w-3.5" />;
  }
};

const blockSummary = (block: DocumentBlock) => {
  if (isRichTextBlock(block)) {
    return stripHtml(block.html) || `${blockLabel(block.type)} block`;
  }

  if (block.type === "code") {
    return block.code.trim().split("\n")[0] || "Code block";
  }

  if (block.type === "table") {
    return `${block.rows.length} row${block.rows.length === 1 ? "" : "s"} table`;
  }

  if (block.type === "image") {
    return block.caption || "Image block";
  }

  if (block.type === "equation") {
    return block.label || block.latex || "Equation block";
  }

  if (block.type === "reference") {
    return block.citationKey || block.source || "Reference block";
  }

  if (block.type === "footnote") {
    return block.footnoteKey || block.content || "Footnote block";
  }

  return blockLabel(block.type);
};

const toImageDataUrl = (image: Pick<ReportImage, "mimeType" | "dataBase64"> | null) => {
  if (!image) {
    return "";
  }

  return `data:${image.mimeType};base64,${image.dataBase64}`;
};

function EditableRichBlock({
  block,
  documentSettings,
  onChange,
  onFocus,
  onKeyDown,
}: {
  block: RichTextBlock;
  documentSettings: DocumentStyleSettings;
  onChange: (html: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const editableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = editableRef.current;
    if (!node) {
      return;
    }

    if (node.innerHTML !== block.html) {
      node.innerHTML = block.html;
    }
  }, [block.html]);

  const isEmpty = useMemo(() => {
    return stripHtml(block.html).length === 0;
  }, [block.html]);

  const baseClass =
    "w-full rounded-xl border border-transparent bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-sky-50/40";

  const typeClass =
    block.type === "heading1"
      ? "text-3xl font-semibold leading-tight"
      : block.type === "heading2"
        ? "text-2xl font-semibold leading-tight"
        : block.type === "heading3"
          ? "text-xl font-semibold leading-tight"
          : block.type === "quote"
            ? "border-l-4 border-slate-300 bg-slate-50 italic"
            : "text-[15px] leading-7";

  const blockFontSize =
    block.type === "heading1"
      ? documentSettings.heading1Size
      : block.type === "heading2"
        ? documentSettings.heading2Size
        : block.type === "heading3"
          ? documentSettings.heading3Size
          : documentSettings.bodyFontSize;

  return (
    <div className="relative">
      {isEmpty ? (
        <p className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">Type / for commands</p>
      ) : null}
      <div
        ref={editableRef}
        data-rich-block-id={block.id}
        contentEditable
        suppressContentEditableWarning
        className={`${baseClass} ${typeClass}`}
        style={{
          fontFamily: documentSettings.fontFamily,
          fontSize: `${ptToPx(blockFontSize)}px`,
          lineHeight: documentSettings.lineSpacing,
        }}
        onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
        onFocus={onFocus}
        onMouseUp={onFocus}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

interface SortableBlockProps {
  block: DocumentBlock;
  image: ReportImage | null;
  documentSettings: DocumentStyleSettings;
  compactMode: boolean;
  isCollapsed: boolean;
  comments: ReportComment[];
  citationKeys: string[];
  footnoteKeys: string[];
  isActive: boolean;
  isSlashOpen: boolean;
  slashQuery: string;
  onSetSlashQuery: (value: string) => void;
  onOpenSlash: (blockId: string) => void;
  onCloseSlash: () => void;
  onSetActiveBlock: (blockId: string) => void;
  onToggleBlockCollapse: (blockId: string) => void;
  onInsertBlockAfter: (blockId: string, type: BlockType) => void;
  onTransformBlock: (blockId: string, type: BlockType) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onUpdateRichBlock: (blockId: string, html: string) => void;
  onUpdateCodeBlock: (blockId: string, code: string) => void;
  onUpdateTableCell: (blockId: string, rowIndex: number, colIndex: number, value: string) => void;
  onAddTableRow: (blockId: string) => void;
  onAddTableColumn: (blockId: string) => void;
  onDeleteTableRow: (blockId: string, rowIndex: number) => void;
  onDeleteTableColumn: (blockId: string, colIndex: number) => void;
  onAttachImageToBlock: (blockId: string, file: File) => Promise<void>;
  onUpdateImageWidth: (blockId: string, width: number) => void;
  onUpdateImageAlignment: (blockId: string, alignment: "left" | "center" | "right") => void;
  onUpdateImageCaption: (blockId: string, caption: string) => void;
  onClearImageBlock: (blockId: string) => void;
  onUpdateEquationBlock: (blockId: string, latex: string, label: string) => void;
  onUpdateReferenceBlock: (blockId: string, citationKey: string, source: string) => void;
  onUpdateFootnoteBlock: (blockId: string, footnoteKey: string, content: string) => void;
  onAddComment: (blockId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleCommentResolved: (commentId: string) => void;
}

const SortableBlock = memo(function SortableBlock({
  block,
  image,
  documentSettings,
  compactMode,
  isCollapsed,
  comments,
  citationKeys,
  footnoteKeys,
  isActive,
  isSlashOpen,
  slashQuery,
  onSetSlashQuery,
  onOpenSlash,
  onCloseSlash,
  onSetActiveBlock,
  onToggleBlockCollapse,
  onInsertBlockAfter,
  onTransformBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onUpdateRichBlock,
  onUpdateCodeBlock,
  onUpdateTableCell,
  onAddTableRow,
  onAddTableColumn,
  onDeleteTableRow,
  onDeleteTableColumn,
  onAttachImageToBlock,
  onUpdateImageWidth,
  onUpdateImageAlignment,
  onUpdateImageCaption,
  onClearImageBlock,
  onUpdateEquationBlock,
  onUpdateReferenceBlock,
  onUpdateFootnoteBlock,
  onAddComment,
  onDeleteComment,
  onToggleCommentResolved,
}: SortableBlockProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const fileInputId = `block-image-${block.id}`;
  const imageResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const filteredCommands = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) {
      return SLASH_COMMANDS;
    }

    return SLASH_COMMANDS.filter((command) => {
      const label = command.label.toLowerCase();
      const keywords = command.keywords.toLowerCase();
      return label.includes(query) || keywords.includes(query);
    });
  }, [slashQuery]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 60 : "auto",
  };

  const syncRichBlockHtml = () => {
    if (!isRichTextBlock(block)) {
      return;
    }

    const node = document.querySelector(
      `[data-rich-block-id="${block.id}"]`
    ) as HTMLDivElement | null;

    if (!node) {
      return;
    }

    onUpdateRichBlock(block.id, node.innerHTML);
  };

  const insertTokenToRichBlock = (token: string) => {
    if (!isRichTextBlock(block)) {
      return;
    }

    onSetActiveBlock(block.id);
    document.execCommand("insertText", false, token);
    syncRichBlockHtml();
  };

  const beginImageResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (block.type !== "image") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    imageResizeStateRef.current = {
      startX: event.clientX,
      startWidth: block.width,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!imageResizeStateRef.current) {
        return;
      }

      const delta = moveEvent.clientX - imageResizeStateRef.current.startX;
      const nextWidth = Math.round(
        Math.max(20, Math.min(100, imageResizeStateRef.current.startWidth + delta / 4))
      );
      onUpdateImageWidth(block.id, nextWidth);
    };

    const handlePointerUp = () => {
      imageResizeStateRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      layout
      whileHover={{ scale: 1.003 }}
      className={`group relative rounded-xl border bg-white px-3 shadow-sm transition dark:bg-slate-900 ${
        isActive ? "border-sky-300 ring-2 ring-sky-100 dark:ring-sky-900/50" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
      }`}
      data-block-id={block.id}
      onMouseDown={() => onSetActiveBlock(block.id)}
    >
      <header className={`flex items-center justify-between gap-3 ${compactMode ? "py-2" : "pt-3 pb-2"}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleBlockCollapse(block.id)}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={isCollapsed ? "Expand block" : "Collapse block"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Drag block"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {blockIcon(block.type)}
            {blockLabel(block.type)}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          {isRichTextBlock(block) && citationKeys.length ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertTokenToRichBlock(`[@${citationKeys[0]}]`)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Insert citation token"
            >
              Cite
            </button>
          ) : null}
          {isRichTextBlock(block) && footnoteKeys.length ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertTokenToRichBlock(`[fn:${footnoteKeys[0]}]`)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Insert footnote token"
            >
              Fn
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              const comment = window.prompt("Add comment");
              if (!comment?.trim()) {
                return;
              }

              onAddComment(block.id, comment.trim());
            }}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Add comment"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onInsertBlockAfter(block.id, "paragraph")}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Add block below"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicateBlock(block.id)}
            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Duplicate block"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteBlock(block.id)}
            className="rounded-md border border-red-200 bg-white p-1.5 text-red-600 transition hover:bg-red-50"
            aria-label="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {isCollapsed ? (
        <div className={`border-t border-slate-100 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 ${compactMode ? "py-2" : "pb-3 pt-2"}`}>
          {blockSummary(block)}
        </div>
      ) : null}

      {!isCollapsed && isRichTextBlock(block) ? (
        <EditableRichBlock
          block={block}
          documentSettings={documentSettings}
          onChange={(html) => onUpdateRichBlock(block.id, html)}
          onFocus={() => onSetActiveBlock(block.id)}
          onKeyDown={(event) => {
            if (event.key === "/" && !event.shiftKey) {
              const selection = window.getSelection();
              if (selection && selection.isCollapsed) {
                event.preventDefault();
                onOpenSlash(block.id);
                return;
              }
            }

            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              (block.type === "heading1" || block.type === "heading2" || block.type === "heading3")
            ) {
              event.preventDefault();
              onInsertBlockAfter(block.id, "paragraph");
            }
          }}
        />
      ) : null}

      {!isCollapsed && block.type === "code" ? (
        <textarea
          value={block.code}
          onChange={(event) => onUpdateCodeBlock(block.id, event.target.value)}
          onFocus={() => onSetActiveBlock(block.id)}
          placeholder="Write code..."
          className="min-h-[180px] w-full rounded-xl border border-slate-200 bg-slate-950 px-3 py-3 font-mono text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-300"
        />
      ) : null}

      {!isCollapsed && isTableBlock(block) ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${block.id}-row-${rowIndex}`} className="border-b border-slate-200">
                    {row.map((cell, colIndex) => (
                      <td key={`${block.id}-cell-${rowIndex}-${colIndex}`} className="border-r border-slate-200">
                        <input
                          value={cell}
                          onFocus={() => onSetActiveBlock(block.id)}
                          onChange={(event) =>
                            onUpdateTableCell(block.id, rowIndex, colIndex, event.target.value)
                          }
                          className="w-full min-w-24 bg-white px-3 py-2 outline-none transition focus:bg-sky-50"
                        />
                      </td>
                    ))}
                    <td className="w-8 px-1 py-1">
                      <button
                        type="button"
                        onClick={() => onDeleteTableRow(block.id, rowIndex)}
                        className="rounded-md border border-red-200 p-1 text-red-600 transition hover:bg-red-50"
                        aria-label="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onAddTableRow(block.id)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              + Row
            </button>
            <button
              type="button"
              onClick={() => onAddTableColumn(block.id)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              + Column
            </button>
            <button
              type="button"
              onClick={() => onDeleteTableColumn(block.id, (block.rows[0]?.length ?? 1) - 1)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Delete Last Column
            </button>
          </div>
        </div>
      ) : null}

      {!isCollapsed && block.type === "image" ? (
        <div className="space-y-3">
          {image ? (
            <div
              className="relative rounded-xl border border-slate-200 bg-slate-50 p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (!file) {
                  return;
                }

                void onAttachImageToBlock(block.id, file);
              }}
            >
              <img
                src={toImageDataUrl(image)}
                alt={block.caption || image.name}
                style={{ width: `${block.width}%` }}
                className={`h-auto max-w-full rounded-lg border border-slate-300 bg-white ${
                  block.alignment === "left"
                    ? ""
                    : block.alignment === "right"
                      ? "ml-auto"
                      : "mx-auto"
                }`}
              />
              <button
                type="button"
                onPointerDown={beginImageResize}
                className="absolute bottom-5 right-5 h-4 w-4 cursor-ew-resize rounded-full border border-slate-400 bg-white shadow-sm"
                aria-label="Resize image"
              />
            </div>
          ) : (
            <div
              className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (!file) {
                  return;
                }

                void onAttachImageToBlock(block.id, file);
              }}
            >
              <p className="text-sm text-slate-500">Upload, paste, or drag an image here.</p>
            </div>
          )}

          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <input
              value={block.caption}
              onChange={(event) => onUpdateImageCaption(block.id, event.target.value)}
              onFocus={() => onSetActiveBlock(block.id)}
              placeholder="Figure caption"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />

            <label
              htmlFor={fileInputId}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ImagePlus className="h-4 w-4" />
              {image ? "Replace" : "Upload"}
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                void onAttachImageToBlock(block.id, file);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              onClick={() => onClearImageBlock(block.id)}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Delete Image
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateImageAlignment(block.id, "left")}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                block.alignment === "left"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Align Left
            </button>
            <button
              type="button"
              onClick={() => onUpdateImageAlignment(block.id, "center")}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                block.alignment === "center"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Align Center
            </button>
            <button
              type="button"
              onClick={() => onUpdateImageAlignment(block.id, "right")}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                block.alignment === "right"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Align Right
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={block.width}
              onChange={(event) => onUpdateImageWidth(block.id, Number(event.target.value))}
              className="h-1.5 w-full accent-sky-700"
            />
            <span className="min-w-12 text-right text-xs font-semibold text-slate-600">
              {block.width}%
            </span>
          </div>
        </div>
      ) : null}

      {!isCollapsed && block.type === "equation" ? (
        <div className="space-y-3">
          <input
            value={block.label}
            onChange={(event) => onUpdateEquationBlock(block.id, block.latex, event.target.value)}
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="Equation label"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <textarea
            value={block.latex}
            onChange={(event) => onUpdateEquationBlock(block.id, event.target.value, block.label)}
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="LaTeX equation"
            className="min-h-28 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700">
            {block.label}: {block.latex || "E = mc^2"}
          </p>
        </div>
      ) : null}

      {!isCollapsed && block.type === "page_break" ? (
        <div className="rounded-xl border border-dashed border-slate-400 bg-slate-50 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Manual Page Break
        </div>
      ) : null}

      {!isCollapsed && block.type === "reference" ? (
        <div className="grid gap-2">
          <input
            value={block.citationKey}
            onChange={(event) =>
              onUpdateReferenceBlock(block.id, event.target.value.trim() || "ref1", block.source)
            }
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="Citation key (e.g., smith2024)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <textarea
            value={block.source}
            onChange={(event) => onUpdateReferenceBlock(block.id, block.citationKey, event.target.value)}
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="Reference source"
            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      ) : null}

      {!isCollapsed && block.type === "footnote" ? (
        <div className="grid gap-2">
          <input
            value={block.footnoteKey}
            onChange={(event) =>
              onUpdateFootnoteBlock(block.id, event.target.value.trim() || "fn1", block.content)
            }
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="Footnote key (e.g., fn1)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <textarea
            value={block.content}
            onChange={(event) => onUpdateFootnoteBlock(block.id, block.footnoteKey, event.target.value)}
            onFocus={() => onSetActiveBlock(block.id)}
            placeholder="Footnote content"
            className="min-h-24 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      ) : null}

      {!isCollapsed && comments.length ? (
        <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border border-amber-200 bg-white p-2">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>
                  {comment.author} - {new Date(comment.createdAt).toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleCommentResolved(comment.id)}
                    className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                  >
                    {comment.resolved ? "Reopen" : "Resolve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(comment.id)}
                    className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className={`text-xs ${comment.resolved ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!isCollapsed && isSlashOpen ? (
        <div className="absolute left-10 top-11 z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
          <input
            autoFocus
            value={slashQuery}
            onChange={(event) => onSetSlashQuery(event.target.value)}
            placeholder="Search block type..."
            className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-sky-300"
          />
          <div className="max-h-56 overflow-y-auto">
            {filteredCommands.map((command) => (
              <button
                key={`${block.id}-${command.type}`}
                type="button"
                onClick={() => {
                  onTransformBlock(block.id, command.type);
                  onCloseSlash();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <span>{command.label}</span>
                <span className="text-xs text-slate-400">/{command.type.replace("_", "")}</span>
              </button>
            ))}
            {!filteredCommands.length ? (
              <p className="px-2.5 py-2 text-xs text-slate-500">No matching block types.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </motion.article>
  );
});

function BlockEditor({
  blocks,
  images,
  documentSettings,
  fontFamilies,
  commentsByBlock,
  citationKeys,
  footnoteKeys,
  activeBlockId,
  compactMode,
  collapsedBlockIds,
  collapsed,
  onToggleCollapse,
  onToggleBlockCollapse,
  onSetActiveBlock,
  onInsertBlockAfter,
  onTransformBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onReorderBlocks,
  onUpdateRichBlock,
  onUpdateCodeBlock,
  onUpdateTableCell,
  onAddTableRow,
  onAddTableColumn,
  onDeleteTableRow,
  onDeleteTableColumn,
  onAttachImageToBlock,
  onInsertImageAfter,
  onUpdateImageWidth,
  onUpdateImageAlignment,
  onUpdateImageCaption,
  onClearImageBlock,
  onUpdateEquationBlock,
  onUpdateReferenceBlock,
  onUpdateFootnoteBlock,
  onAddComment,
  onDeleteComment,
  onToggleCommentResolved,
}: BlockEditorProps) {
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [toolbarColor, setToolbarColor] = useState("#111827");
  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [addBlockMenuOpen, setAddBlockMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const setSlashQuery = useCallback((value: string) => {
    setSlashState((current) => (current ? { ...current, query: value } : current));
  }, []);

  const closeSlash = useCallback(() => {
    setSlashState(null);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-block-id]")) {
        setSlashState(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      const root = editorRootRef.current;
      const selection = window.getSelection();

      if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbar(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const anchorNode = selection.anchorNode;
      if (!anchorNode) {
        setToolbar(null);
        return;
      }

      const anchorElement =
        anchorNode.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : (anchorNode.parentElement as HTMLElement | null);

      if (!anchorElement || !root.contains(anchorElement)) {
        setToolbar(null);
        return;
      }

      const richContainer = anchorElement.closest("[data-rich-block-id]") as HTMLElement | null;
      if (!richContainer) {
        setToolbar(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setToolbar(null);
        return;
      }

      setToolbar({
        blockId: richContainer.dataset.richBlockId ?? "",
        top: rect.top - 54,
        left: rect.left + rect.width / 2,
      });
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;

      if (!isMeta) {
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "h") {
        const root = editorRootRef.current;
        const selection = window.getSelection();
        if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }

        const anchorNode = selection.anchorNode;
        if (!anchorNode) {
          return;
        }

        const anchorElement =
          anchorNode.nodeType === Node.ELEMENT_NODE
            ? (anchorNode as HTMLElement)
            : (anchorNode.parentElement as HTMLElement | null);

        if (!anchorElement || !root.contains(anchorElement)) {
          return;
        }

        const richContainer = anchorElement.closest("[data-rich-block-id]") as HTMLElement | null;
        if (!richContainer?.dataset.richBlockId) {
          return;
        }

        event.preventDefault();
        document.execCommand("hiliteColor", false, "#fff59d");
        onUpdateRichBlock(richContainer.dataset.richBlockId, richContainer.innerHTML);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onUpdateRichBlock]);

  const syncToolbarBlockHtml = useCallback(
    (blockId: string) => {
      const root = editorRootRef.current;
      if (!root || !blockId) {
        return;
      }

      const node = root.querySelector(`[data-rich-block-id="${blockId}"]`) as HTMLDivElement | null;
      if (!node) {
        return;
      }

      onUpdateRichBlock(blockId, node.innerHTML);
    },
    [onUpdateRichBlock]
  );

  const runToolbarCommand = useCallback(
    (command: string, value?: string) => {
      if (!toolbar?.blockId) {
        return;
      }

      document.execCommand(command, false, value);
      syncToolbarBlockHtml(toolbar.blockId);
    },
    [syncToolbarBlockHtml, toolbar]
  );

  useEffect(() => {
    const applyExternalCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: string; value?: string }>;
      const command = customEvent.detail?.command;
      if (!command) {
        return;
      }

      const root = editorRootRef.current;
      if (!root) {
        return;
      }

      let targetBlockId = activeBlockId ?? "";
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode ?? null;
      const anchorElement =
        anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (anchorNode as HTMLElement)
          : (anchorNode?.parentElement as HTMLElement | null);
      const richContainer = anchorElement?.closest("[data-rich-block-id]") as HTMLElement | null;
      if (richContainer?.dataset.richBlockId) {
        targetBlockId = richContainer.dataset.richBlockId;
      }

      if (!targetBlockId) {
        return;
      }

      const blockNode = root.querySelector(
        `[data-rich-block-id="${targetBlockId}"]`
      ) as HTMLDivElement | null;
      if (!blockNode) {
        return;
      }

      blockNode.focus();
      document.execCommand(command, false, customEvent.detail?.value);
      onUpdateRichBlock(targetBlockId, blockNode.innerHTML);
    };

    window.addEventListener("rf-editor-command", applyExternalCommand as EventListener);
    return () => window.removeEventListener("rf-editor-command", applyExternalCommand as EventListener);
  }, [activeBlockId, onUpdateRichBlock]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const fromIndex = blocks.findIndex((block) => block.id === active.id);
      const toIndex = blocks.findIndex((block) => block.id === over.id);

      if (fromIndex === -1 || toIndex === -1) {
        return;
      }

      onReorderBlocks(fromIndex, toIndex);
    },
    [blocks, onReorderBlocks]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const imageItem = Array.from(event.clipboardData.items).find((item) =>
        item.type.startsWith("image/")
      );

      if (!imageItem) {
        return;
      }

      const file = imageItem.getAsFile();
      if (!file) {
        return;
      }

      event.preventDefault();
      void onInsertImageAfter(activeBlockId, file);
    },
    [activeBlockId, onInsertImageAfter]
  );

  if (collapsed) {
    return (
      <aside className="flex h-full flex-col items-center rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Expand editor panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <section className="surface-card relative flex h-full min-h-0 flex-col overflow-hidden dark:bg-slate-950">
      {toolbar ? (
        <div
          className="fixed z-[70] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          style={{ top: toolbar.top, left: toolbar.left }}
        >
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("bold")}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("italic")}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("underline")}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("hiliteColor", "#fff59d")}
            aria-label="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <input
            type="color"
            value={toolbarColor}
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => {
              const value = event.target.value;
              setToolbarColor(value);
              runToolbarCommand("foreColor", value);
            }}
            className="h-7 w-7 cursor-pointer rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-950"
            aria-label="Text color"
          />
          <select
            defaultValue={documentSettings.fontFamily}
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => runToolbarCommand("fontName", event.target.value)}
            className="rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Font family"
          >
            {fontFamilies.map((fontFamily) => (
              <option key={fontFamily} value={fontFamily}>
                {fontFamily}
              </option>
            ))}
          </select>
          <select
            defaultValue="3"
            onMouseDown={(event) => event.preventDefault()}
            onChange={(event) => runToolbarCommand("fontSize", event.target.value)}
            className="rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Font size"
          >
            {TOOLBAR_FONT_SIZE_OPTIONS.map((sizeOption) => (
              <option key={sizeOption.commandValue} value={sizeOption.commandValue}>
                {sizeOption.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("justifyLeft")}
            aria-label="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("justifyCenter")}
            aria-label="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("justifyRight")}
            aria-label="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("justifyFull")}
            aria-label="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("insertUnorderedList")}
            aria-label="Bullet list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runToolbarCommand("insertOrderedList")}
            aria-label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Editor</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Document Blocks</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {compactMode ? "Compact mode enabled" : "Expanded editing mode"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddBlockMenuOpen((open) => !open)}
              onBlur={() => setTimeout(() => setAddBlockMenuOpen(false), 150)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Block
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {addBlockMenuOpen ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "paragraph"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 text-slate-500" /> Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "heading1"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Heading1 className="h-4 w-4 text-slate-500" /> Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "heading2"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Heading2 className="h-4 w-4 text-slate-500" /> Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "heading3"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Heading3 className="h-4 w-4 text-slate-500" /> Heading 3
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "bullet_list"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <List className="h-4 w-4 text-slate-500" /> Bullet List
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "numbered_list"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ListOrdered className="h-4 w-4 text-slate-500" /> Number List
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "image"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ImagePlus className="h-4 w-4 text-slate-500" /> Image
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "table"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Table className="h-4 w-4 text-slate-500" /> Table
                </button>
                <button
                  type="button"
                  onClick={() => { onInsertBlockAfter(activeBlockId, "page_break"); setAddBlockMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <RectangleHorizontal className="h-4 w-4 text-slate-500" /> Page Break
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Collapse editor panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={editorRootRef}
        className="editor-surface min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4 dark:bg-slate-950"
        onPaste={handlePaste}
      >
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Use <span className="font-semibold">/</span> inside text blocks to open block commands. Paste an image
          to insert it as a new image block.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            <div className={`${compactMode ? "space-y-2" : "space-y-3"} pb-10`}>
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  image={block.type === "image" ? images[block.imageId] ?? null : null}
                  documentSettings={documentSettings}
                  compactMode={compactMode}
                  isCollapsed={collapsedBlockIds.includes(block.id)}
                  comments={commentsByBlock[block.id] ?? []}
                  citationKeys={citationKeys}
                  footnoteKeys={footnoteKeys}
                  isActive={activeBlockId === block.id}
                  isSlashOpen={slashState?.blockId === block.id}
                  slashQuery={slashState?.blockId === block.id ? slashState.query : ""}
                  onSetSlashQuery={setSlashQuery}
                  onOpenSlash={(blockId) => setSlashState({ blockId, query: "" })}
                  onCloseSlash={closeSlash}
                  onSetActiveBlock={onSetActiveBlock}
                  onToggleBlockCollapse={onToggleBlockCollapse}
                  onInsertBlockAfter={onInsertBlockAfter}
                  onTransformBlock={onTransformBlock}
                  onDeleteBlock={onDeleteBlock}
                  onDuplicateBlock={onDuplicateBlock}
                  onUpdateRichBlock={onUpdateRichBlock}
                  onUpdateCodeBlock={onUpdateCodeBlock}
                  onUpdateTableCell={onUpdateTableCell}
                  onAddTableRow={onAddTableRow}
                  onAddTableColumn={onAddTableColumn}
                  onDeleteTableRow={onDeleteTableRow}
                  onDeleteTableColumn={onDeleteTableColumn}
                  onAttachImageToBlock={onAttachImageToBlock}
                  onUpdateImageWidth={onUpdateImageWidth}
                  onUpdateImageAlignment={onUpdateImageAlignment}
                  onUpdateImageCaption={onUpdateImageCaption}
                  onClearImageBlock={onClearImageBlock}
                  onUpdateEquationBlock={onUpdateEquationBlock}
                  onUpdateReferenceBlock={onUpdateReferenceBlock}
                  onUpdateFootnoteBlock={onUpdateFootnoteBlock}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  onToggleCommentResolved={onToggleCommentResolved}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </section>
  );
}

export default memo(BlockEditor);
