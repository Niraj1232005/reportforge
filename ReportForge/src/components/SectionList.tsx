"use client";

import { memo, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { EditorSelection, ReportSection } from "@/types/editor";

interface SectionListProps {
  sections: ReportSection[];
  selection: EditorSelection | null;
  onReorderSections: (fromIndex: number, toIndex: number) => void;
  onReorderSubsections: (
    sectionIndex: number,
    fromIndex: number,
    toIndex: number
  ) => void;
  onSelectSection: (sectionIndex: number) => void;
  onSelectSubsection: (sectionIndex: number, subsectionIndex: number) => void;
  onAddSection: () => void;
  onAddSubsection: (sectionIndex: number) => void;
  onRenameSection: (sectionIndex: number) => void;
  onDeleteSection: (sectionIndex: number) => void;
}

type SortableDragData =
  | { type: "section"; sectionIndex: number }
  | { type: "subsection"; sectionIndex: number; subsectionIndex: number };

interface SortableSubsectionRowProps {
  sectionIndex: number;
  subsectionIndex: number;
  subsectionTitle: string;
  isSelected: boolean;
  onSelect: () => void;
}

const SortableSubsectionRow = memo(function SortableSubsectionRow({
  sectionIndex,
  subsectionIndex,
  subsectionTitle,
  isSelected,
  onSelect,
}: SortableSubsectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `subsection-${sectionIndex}-${subsectionIndex}`,
    data: {
      type: "subsection",
      sectionIndex,
      subsectionIndex,
    } satisfies SortableDragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all ${
        isSelected
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        {sectionIndex + 1}.{subsectionIndex + 1} {subsectionTitle || "Untitled Subsection"}
      </button>
      <button
        type="button"
        aria-label="Drag subsection"
        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
});

interface SortableSectionCardProps {
  section: ReportSection;
  sectionIndex: number;
  selection: EditorSelection | null;
  onSelectSection: (sectionIndex: number) => void;
  onSelectSubsection: (sectionIndex: number, subsectionIndex: number) => void;
  onAddSubsection: (sectionIndex: number) => void;
  onRenameSection: (sectionIndex: number) => void;
  onDeleteSection: (sectionIndex: number) => void;
}

const SortableSectionCard = memo(function SortableSectionCard({
  section,
  sectionIndex,
  selection,
  onSelectSection,
  onSelectSubsection,
  onAddSubsection,
  onRenameSection,
  onDeleteSection,
}: SortableSectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${sectionIndex}`,
    data: {
      type: "section",
      sectionIndex,
    } satisfies SortableDragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSectionSelected =
    selection?.sectionIndex === sectionIndex && selection?.subsectionIndex === null;

  const subsectionItems = useMemo(() => {
    return section.subsections.map((_, subsectionIndex) => `subsection-${sectionIndex}-${subsectionIndex}`);
  }, [section.subsections, sectionIndex]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-3 transition duration-200 ${
        isDragging ? "opacity-60" : "hover:shadow-sm"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => onSelectSection(sectionIndex)}
          className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
            isSectionSelected
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-900 hover:bg-slate-200"
          }`}
        >
          {sectionIndex + 1} {section.title || "Untitled Section"}
        </button>
        <button
          type="button"
          aria-label="Drag section"
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2">
        <button
          onClick={() => onAddSubsection(sectionIndex)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Subsection
        </button>
        <button
          onClick={() => onRenameSection(sectionIndex)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
        <button
          onClick={() => onDeleteSection(sectionIndex)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-300 px-2 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <SortableContext items={subsectionItems} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {section.subsections.map((subsection, subsectionIndex) => (
            <SortableSubsectionRow
              key={`${section.id}-${subsection.id}`}
              sectionIndex={sectionIndex}
              subsectionIndex={subsectionIndex}
              subsectionTitle={subsection.title}
              isSelected={
                selection?.sectionIndex === sectionIndex &&
                selection?.subsectionIndex === subsectionIndex
              }
              onSelect={() => onSelectSubsection(sectionIndex, subsectionIndex)}
            />
          ))}
        </div>
      </SortableContext>
    </article>
  );
});

function SectionList({
  sections,
  selection,
  onReorderSections,
  onReorderSubsections,
  onSelectSection,
  onSelectSubsection,
  onAddSection,
  onAddSubsection,
  onRenameSection,
  onDeleteSection,
}: SectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const sectionItems = useMemo(() => {
    return sections.map((_, sectionIndex) => `section-${sectionIndex}`);
  }, [sections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeData = active.data.current as SortableDragData | undefined;
    const overData = over.data.current as SortableDragData | undefined;

    if (!activeData || !overData) {
      return;
    }

    if (activeData.type === "section" && overData.type === "section") {
      onReorderSections(activeData.sectionIndex, overData.sectionIndex);
      return;
    }

    if (
      activeData.type === "subsection" &&
      overData.type === "subsection" &&
      activeData.sectionIndex === overData.sectionIndex
    ) {
      onReorderSubsections(
        activeData.sectionIndex,
        activeData.subsectionIndex,
        overData.subsectionIndex
      );
    }
  };

  return (
    <aside className="soft-card flex h-full min-h-0 flex-col rounded-l-2xl border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Structure
        </p>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Sections</h2>
        <button
          onClick={onAddSection}
          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sectionItems} strategy={verticalListSortingStrategy}>
            <div className="h-full min-h-0 space-y-3 overflow-y-auto p-3">
              {sections.map((section, sectionIndex) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  selection={selection}
                  onSelectSection={onSelectSection}
                  onSelectSubsection={onSelectSubsection}
                  onAddSubsection={onAddSubsection}
                  onRenameSection={onRenameSection}
                  onDeleteSection={onDeleteSection}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}

export default memo(SectionList);
