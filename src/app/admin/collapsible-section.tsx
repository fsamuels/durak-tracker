"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A titled admin section whose body collapses. The header (title + summary +
 * chevron) is itself the toggle and stays visible when collapsed; the
 * description also stays visible. Only the `children` panel is hidden. Sections
 * start collapsed by default so the page opens as an at-a-glance overview;
 * `defaultOpen` (e.g. when the section failed to load) forces it open.
 */
export function CollapsibleSection({
  title,
  summary,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Right-aligned at-a-glance count shown next to the chevron. */
  summary?: ReactNode;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="-mx-1 flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
      >
        <h2 className="text-sm font-medium text-zinc-500">{title}</h2>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600">
          {summary}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M4 6l4 4 4-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      <div id={panelId} hidden={!open} className="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}
