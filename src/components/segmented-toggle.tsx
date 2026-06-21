import Link from "next/link";

export type SegmentedItem = {
  /** Visible label. */
  label: string;
  /** Destination; selecting a segment is a navigation. */
  href: string;
  /** Whether this is the currently-selected segment. */
  active: boolean;
};

/**
 * Pill segmented control rendered as links, so the pages that use it stay server
 * components — selecting a segment navigates to a new URL the server reads back.
 * Shared by the stats time-window toggle and the game-history period filter.
 */
export function SegmentedToggle({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: SegmentedItem[];
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="card-surface flex gap-1 rounded-2xl p-1"
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          role="tab"
          aria-selected={item.active}
          scroll={false}
          className={`flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-medium transition-colors ${
            item.active
              ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
              : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
