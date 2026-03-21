"use client";

import { memo } from "react";
import { ListTree } from "lucide-react";
import type { OutlineItem } from "@/lib/block-utils";

interface OutlinePanelProps {
  outline: OutlineItem[];
  activeBlockId: string | null;
  onJumpToBlock: (blockId: string) => void;
}

function OutlinePanel({ outline, activeBlockId, onJumpToBlock }: OutlinePanelProps) {
  return (
    <aside className="surface-card flex h-full min-h-0 flex-col overflow-hidden dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Navigation
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
          Document Outline
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Jump between sections and keep the structure in view.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {outline.length ? (
          <ul className="space-y-1.5">
            {outline.map((item) => (
              <li key={item.blockId}>
                <button
                  type="button"
                  onClick={() => onJumpToBlock(item.blockId)}
                  className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-100 ${
                    activeBlockId === item.blockId
                      ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:ring-blue-900"
                      : ""
                  } ${
                    item.level === 1
                      ? "font-semibold text-slate-900 dark:text-slate-100"
                      : item.level === 2
                        ? "pl-5 text-slate-700 dark:text-slate-300"
                        : "pl-8 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <span className="min-w-10 text-xs font-semibold text-slate-500 dark:text-slate-500">
                    {item.number}
                  </span>
                  <span className="line-clamp-2">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <ListTree className="mx-auto mb-2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            Add heading blocks to generate the outline.
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(OutlinePanel);
