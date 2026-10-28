import Link from "next/link";

import { cardClass, cx, segmentClass } from "@/lib/ui";

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
      className={cx(cardClass, "flex gap-1 p-1")}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          role="tab"
          aria-selected={item.active}
          scroll={false}
          className={segmentClass(item.active)}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
