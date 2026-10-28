import type { ReactNode } from "react";

import { PageShell } from "@/components/ui";
import { cardClass, cx } from "@/lib/ui";

/**
 * Loading placeholders for the route-level `loading.tsx` files. Each one mirrors
 * the real page's layout (same `PageShell` column, card radii and spacing), so
 * the content swaps in without the page jumping. The pulse is `motion-safe`, so
 * it stays still for people who ask for reduced motion.
 */

/** A pulsing grey block. Size it with `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        "bg-black/[0.07] motion-safe:animate-pulse dark:bg-white/10",
        // Default radius only when the caller doesn't set one: two rounded-*
        // utilities on one element resolve by stylesheet order, not class order.
        !className?.includes("rounded-") && "rounded-lg",
        className,
      )}
    />
  );
}

/**
 * Page wrapper: the standard column, marked busy, with a screen-reader-only
 * "Loading…" status so the wait is announced once.
 */
export function SkeletonPage({
  label = "Loading…",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <PageShell>
      <div aria-busy="true" className="flex flex-col gap-6">
        <p role="status" className="sr-only">
          {label}
        </p>
        {children}
      </div>
    </PageShell>
  );
}

/** Title block matching `PageHeader`: optional back link, h1, description. */
export function SkeletonHeader({
  back = false,
  description = true,
  avatar = false,
}: {
  back?: boolean;
  description?: boolean;
  avatar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {back && <Skeleton className="h-4 w-24" />}
      <div className="flex items-center gap-3">
        {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
        <Skeleton className="h-8 w-48" />
      </div>
      {description && (
        <>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </>
      )}
    </div>
  );
}

/** A small section heading placeholder (matches `SectionTitle`). */
export function SkeletonSectionTitle() {
  return <Skeleton className="h-4 w-28" />;
}

/** One card row: optional avatar, two text lines, optional trailing pill. */
export function SkeletonRow({
  avatar = true,
  trailing = false,
  tall = false,
}: {
  avatar?: boolean;
  trailing?: boolean;
  /** Taller card, e.g. a game card with its Play again button. */
  tall?: boolean;
}) {
  return (
    <div className={cx(cardClass, "flex flex-col gap-3 px-4 py-3")}>
      <div className="flex items-center gap-3">
        {avatar && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        {trailing && <Skeleton className="h-5 w-16 shrink-0 rounded-full" />}
      </div>
      {tall && <Skeleton className="h-12 w-full rounded-full" />}
    </div>
  );
}

/** A stack of `SkeletonRow`s. */
export function SkeletonList({
  rows = 4,
  ...row
}: {
  rows?: number;
} & Parameters<typeof SkeletonRow>[0]) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} {...row} />
      ))}
    </div>
  );
}

/** A grid of `StatTile` placeholders. */
export function SkeletonStatGrid({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: tiles }, (_, i) => (
        <div key={i} className={cx(cardClass, "flex flex-col gap-2 px-4 py-3")}>
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** A full-width card placeholder of a given height (charts, detail panels). */
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cx("w-full rounded-2xl", className)} />;
}

/** Segmented-control placeholder (period / window filters). */
export function SkeletonSegmented() {
  return <SkeletonCard className="h-10" />;
}

/** Pill button placeholder (primary CTA = lg, others = md). */
export function SkeletonButton({ size = "lg" }: { size?: "md" | "lg" }) {
  return (
    <Skeleton
      className={cx("w-full rounded-full", size === "lg" ? "h-12" : "h-11")}
    />
  );
}

/** Text-field placeholder, optionally with its label line. */
export function SkeletonField({ label = true }: { label?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

/** Player chip grid placeholder (search field + wrapped chips). */
export function SkeletonChips({ chips = 6 }: { chips?: number }) {
  const widths = ["w-24", "w-20", "w-28", "w-16", "w-24", "w-20", "w-28"];
  return (
    <div className="flex flex-col gap-3">
      <SkeletonField label={false} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: chips }, (_, i) => (
          <Skeleton
            key={i}
            className={cx("h-9 rounded-full", widths[i % widths.length])}
          />
        ))}
      </div>
    </div>
  );
}
