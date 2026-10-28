import Link from "next/link";
import type { ReactNode } from "react";

import {
  badgeClass,
  cardClass,
  cx,
  mutedLinkClass,
  type BadgeTone,
} from "@/lib/ui";

/**
 * Shared layout and content primitives. Every signed-in page is a `PageShell`
 * with a `PageHeader`, then `Section`s; lists fall back to an `EmptyState`, and
 * form feedback goes through `FormMessage`. Class tokens live in `@/lib/ui`.
 * All of these are server-safe (no hooks), so client forms can use them too.
 */

/** The standard page column: centered, phone-width, consistent padding/gap. */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cx(
        "mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** "← Label" link back to the parent screen, shown above a page title. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cx(mutedLinkClass, "self-start")}>
      ← {label}
    </Link>
  );
}

/** Page title block: optional back link, title (+ leading media), description. */
export function PageHeader({
  title,
  description,
  back,
  media,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  /** Rendered before the title on the same line, e.g. an avatar. */
  media?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {back && <BackLink {...back} />}
      <div className="flex min-w-0 items-center gap-3">
        {media}
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {title}
        </h1>
      </div>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

/** Small muted heading that labels a section of a page. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-medium text-zinc-500">{children}</h2>;
}

/** A titled page section, with an optional right-aligned action link. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("flex flex-col gap-3", className)}>
      {(title || action) && (
        <div className="flex items-baseline justify-between gap-3">
          {title && <SectionTitle>{title}</SectionTitle>}
          {action && (
            <Link href={action.href} className={mutedLinkClass}>
              {action.label}
            </Link>
          )}
        </div>
      )}
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

/** Dashed placeholder for an empty list. Use `as="li"` inside a `<ul>`. */
export function EmptyState({
  children,
  as: Tag = "div",
}: {
  children: ReactNode;
  as?: "div" | "li" | "p";
}) {
  return (
    <Tag className="rounded-2xl border border-dashed border-black/15 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
      {children}
    </Tag>
  );
}

/** Inline form/load feedback: errors are announced as alerts, success as status. */
export function FormMessage({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  return tone === "error" ? (
    <p
      role="alert"
      className={cx("text-sm text-red-600 dark:text-red-400", className)}
    >
      {children}
    </p>
  ) : (
    <p
      role="status"
      className={cx(
        "text-sm text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Small pill label. */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={badgeClass(tone)}>{children}</span>;
}

/** Number-over-label tile for stat grids. */
export function StatTile({
  label,
  value,
  sub,
  highlight = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Brand-gradient value, for the headline numbers on the home dashboard. */
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx(cardClass, "flex flex-col gap-0.5 px-4 py-3", className)}
    >
      <span
        className={cx(
          "break-words text-2xl font-semibold tracking-tight tabular-nums",
          highlight
            ? "text-brand-gradient font-bold"
            : "text-black dark:text-zinc-50",
        )}
      >
        {value}
      </span>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {sub && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{sub}</span>
      )}
    </div>
  );
}

/**
 * Full-width card with leading media (avatar/emoji), a title and a caption —
 * the "who" cards on the home and stats pages (last durak, champion, …).
 */
export function HighlightCard({
  media,
  title,
  caption,
  className,
}: {
  media?: ReactNode;
  title: ReactNode;
  caption: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(cardClass, "flex items-center gap-3 px-4 py-3", className)}
    >
      {media}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          {title}
        </span>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {caption}
        </span>
      </div>
    </div>
  );
}

/**
 * Labeled form field: label text (with an "(optional)" hint), the control
 * passed as children, and a per-field error.
 */
export function Field({
  label,
  optional = false,
  error,
  children,
}: {
  label: ReactNode;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-black dark:text-zinc-50">
      <span>
        {label}
        {optional && (
          <span className="font-normal text-zinc-400"> (optional)</span>
        )}
      </span>
      {children}
      {error && (
        <span className="text-sm font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
