"use client";

import { memo, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Trash2,
  Underline,
} from "lucide-react";
import type {
  EditableField,
  EditorSelection,
  ReportImage,
  ReportSection,
  ReportSubsection,
} from "@/types/editor";

const IMAGE_MARKDOWN_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_REF_PREFIX = "rf-image://";

interface SectionEditorProps {
  sections: ReportSection[];
  selection: EditorSelection | null;
  onUpdateSection: (
    sectionIndex: number,
    field: EditableField,
    value: string
  ) => void;
  onUpdateSubsection: (
    sectionIndex: number,
    subsectionIndex: number,
    field: EditableField,
    value: string
  ) => void;
  onAddImage: (
    sectionIndex: number,
    subsectionIndex: number | null,
    image: ReportImage
  ) => void;
}

const FONT_SIZES = [
  { label: "12", value: "2" },
  { label: "14", value: "3" },
  { label: "18", value: "4" },
  { label: "24", value: "5" },
];

const FONT_FAMILIES = ["Inter", "Times New Roman", "Georgia", "Arial"];

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const toParagraphHtml = (value: string) => {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
};

const normalizeLegacyContent = (value: string) => {
  const content = value.trim();

  if (!content) {
    return "<p><br /></p>";
  }

  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  let cursor = 0;
  const htmlBlocks: string[] = [];

  for (const match of content.matchAll(IMAGE_MARKDOWN_PATTERN)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const textBefore = content.slice(cursor, start);
    const alt = (match[1] || "Figure").trim() || "Figure";
    const source = (match[2] || "").trim();
    const imageId = source.startsWith(IMAGE_REF_PREFIX)
      ? source.slice(IMAGE_REF_PREFIX.length)
      : "";
    const imageDataAttribute = imageId ? ` data-rf-image-id="${escapeHtml(imageId)}"` : "";

    if (textBefore.trim()) {
      htmlBlocks.push(toParagraphHtml(textBefore));
    }

    if (source) {
      htmlBlocks.push(
        `<figure><img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}"${imageDataAttribute} style="width:75%;max-width:100%;height:auto;" /><figcaption>${escapeHtml(alt)}</figcaption></figure>`
      );
    }

    cursor = end;
  }

  const trailing = content.slice(cursor);
  if (trailing.trim()) {
    htmlBlocks.push(toParagraphHtml(trailing));
  }

  if (!htmlBlocks.length) {
    return "<p><br /></p>";
  }

  return htmlBlocks.join("");
};

function SectionEditor({
  sections,
  selection,
  onUpdateSection,
  onUpdateSubsection,
  onAddImage,
}: SectionEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [imageLabel, setImageLabel] = useState("Figure");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState(75);

  const section = selection ? sections[selection.sectionIndex] ?? null : null;
  const isSubsection = selection?.subsectionIndex !== null;
  const subsection: ReportSubsection | null =
    selection && section && selection.subsectionIndex !== null
      ? section.subsections[selection.subsectionIndex] ?? null
      : null;

  const number = selection
    ? isSubsection
      ? `${selection.sectionIndex + 1}.${(selection.subsectionIndex ?? 0) + 1}`
      : `${selection.sectionIndex + 1}`
    : "-";

  const title = isSubsection ? subsection?.title ?? "" : section?.title ?? "";
  const content = isSubsection ? subsection?.content ?? "" : section?.content ?? "";
  const images = isSubsection ? subsection?.images ?? [] : section?.images ?? [];

  const editableContent = useMemo(() => normalizeLegacyContent(content), [content]);

  const updateField = (field: EditableField, value: string) => {
    if (!selection || !section) {
      return;
    }

    if (isSubsection && selection.subsectionIndex !== null) {
      onUpdateSubsection(selection.sectionIndex, selection.subsectionIndex, field, value);
      return;
    }

    onUpdateSection(selection.sectionIndex, field, value);
  };

  const createImageId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const parseDataUrl = (value: string) => {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return null;
    }

    return {
      mimeType: match[1],
      dataBase64: match[2],
    };
  };

  const saveSelection = () => {
    const selectionInstance = window.getSelection();
    if (!selectionInstance || selectionInstance.rangeCount === 0) {
      return;
    }

    const range = selectionInstance.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      return;
    }

    savedRangeRef.current = range;
  };

  const restoreSelection = () => {
    const selectionInstance = window.getSelection();
    const range = savedRangeRef.current;

    if (!selectionInstance || !range) {
      return;
    }

    selectionInstance.removeAllRanges();
    selectionInstance.addRange(range);
  };

  const pushEditorContent = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const html = editor.innerHTML.trim();
    updateField("content", html || "<p><br /></p>");
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    pushEditorContent();
  };

  const insertImageElement = (source: string, alt: string, imageId: string) => {
    const safeAlt = escapeHtml(alt);
    const html = `<figure><img src="${escapeHtml(source)}" alt="${safeAlt}" data-rf-image-id="${escapeHtml(imageId)}" style="width:75%;max-width:100%;height:auto;" /><figcaption>${safeAlt}</figcaption></figure><p><br /></p>`;
    runCommand("insertHTML", html);
  };

  const handleUploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    if (!selection || !section) {
      return;
    }

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

      const parsed = parseDataUrl(result);
      if (!parsed) {
        return;
      }

      const generatedLabel = imageLabel.trim() || file.name.replace(/\.[^/.]+$/, "") || "Figure";
      const imageId = createImageId();

      onAddImage(selection.sectionIndex, selection.subsectionIndex, {
        id: imageId,
        name: generatedLabel,
        mimeType: parsed.mimeType,
        dataBase64: parsed.dataBase64,
      });

      insertImageElement(`${IMAGE_REF_PREFIX}${imageId}`, generatedLabel, imageId);
      setSelectedImageId(imageId);
      setSelectedImageWidth(75);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateImageWidth = (nextWidth: number) => {
    if (!selectedImageId || !editorRef.current) {
      return;
    }

    const image = editorRef.current.querySelector(
      `img[data-rf-image-id="${selectedImageId}"]`
    ) as HTMLImageElement | null;

    if (!image) {
      setSelectedImageId(null);
      return;
    }

    image.style.width = `${nextWidth}%`;
    image.style.maxWidth = "100%";
    image.style.height = "auto";
    setSelectedImageWidth(nextWidth);
    pushEditorContent();
  };

  const deleteSelectedImage = () => {
    if (!selectedImageId || !editorRef.current) {
      return;
    }

    const image = editorRef.current.querySelector(
      `img[data-rf-image-id="${selectedImageId}"]`
    ) as HTMLImageElement | null;

    if (!image) {
      setSelectedImageId(null);
      return;
    }

    const figure = image.closest("figure");
    if (figure) {
      figure.remove();
    } else {
      image.remove();
    }

    setSelectedImageId(null);
    pushEditorContent();
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== editableContent) {
      editor.innerHTML = editableContent;
    }
  }, [editableContent]);

  if (!selection) {
    return (
      <div className="soft-card flex h-full min-h-0 items-center justify-center rounded-none border-l border-r border-slate-200 bg-white p-6 text-sm text-slate-500">
        Add a section to begin editing.
      </div>
    );
  }

  if (!section) {
    return (
      <div className="soft-card flex h-full min-h-0 items-center justify-center rounded-none border-l border-r border-slate-200 bg-white p-6 text-sm text-slate-500">
        Select a valid section.
      </div>
    );
  }

  return (
    <section className="soft-card editor-surface flex h-full min-h-0 flex-col rounded-none border-l border-r border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Rich Text Editor
        </p>
        <h2 className="text-sm font-semibold text-slate-900">
          Editing {isSubsection ? "Subsection" : "Section"} {number}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Title
          </label>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={title}
            onChange={(event) => updateField("title", event.target.value)}
          />
        </div>

        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => runCommand("bold")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("italic")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("underline")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>

            <select
              defaultValue="Inter"
              onChange={(event) => runCommand("fontName", event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              {FONT_FAMILIES.map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
            </select>

            <select
              defaultValue="3"
              onChange={(event) => runCommand("fontSize", event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => runCommand("justifyLeft")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("justifyCenter")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("justifyRight")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("justifyFull")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("insertUnorderedList")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand("insertOrderedList")}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
              aria-label="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={imageLabel}
              onChange={(event) => setImageLabel(event.target.value)}
              placeholder="Figure caption"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ImagePlus className="h-4 w-4" />
              Insert Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
          </div>

          {selectedImageId ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Selected Image
              </p>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={selectedImageWidth}
                onChange={(event) => updateImageWidth(Number(event.target.value))}
                className="h-1.5 w-40 accent-slate-900"
              />
              <span className="text-xs font-semibold text-slate-600">{selectedImageWidth}%</span>
              <button
                type="button"
                onClick={deleteSelectedImage}
                className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={pushEditorContent}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            const image = target.closest("img") as HTMLImageElement | null;

            if (!image) {
              setSelectedImageId(null);
              saveSelection();
              return;
            }

            const imageId = image.dataset.rfImageId;
            setSelectedImageId(imageId ?? null);

            if (image.style.width.endsWith("%")) {
              const numericWidth = Number(image.style.width.replace("%", ""));
              if (!Number.isNaN(numericWidth)) {
                setSelectedImageWidth(Math.min(100, Math.max(20, numericWidth)));
              }
            }

            saveSelection();
          }}
          className="doc-rich min-h-[360px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-900"
        />

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Images In This {isSubsection ? "Subsection" : "Section"} ({images.length})
          </p>
          <div className="mt-1 text-xs text-slate-600">
            {images.length ? images.map((image) => image.name).join(", ") : "No images uploaded yet."}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(SectionEditor);
