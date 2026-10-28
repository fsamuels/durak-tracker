/**
 * Shared design tokens as Tailwind class strings — the single source for how
 * buttons, inputs, cards, links and badges look across the app. Components in
 * `src/components/ui.tsx` wrap the structural ones; anything that has to style
 * a native element directly (a `<Link>`, a react-hook-form `register`ed input)
 * uses these strings instead of re-typing the classes.
 */

/** Join class names, skipping falsy entries. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "solid" | "outline" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  // Gradient CTA — one per screen for the main action (see .btn-brand).
  primary: "btn-brand font-semibold",
  // High-contrast secondary action, e.g. an inline "Add" or "Save".
  solid:
    "bg-black font-medium text-white hover:bg-zinc-800 active:brightness-90 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200",
  // Low-emphasis action.
  outline:
    "border border-black/15 font-medium text-black hover:bg-black/5 active:bg-black/10 dark:border-white/20 dark:text-zinc-50 dark:hover:bg-white/5 dark:active:bg-white/10",
  // Destructive action.
  danger:
    "border border-red-500/30 font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-5 text-base",
};

/** Class string for a button (or a link styled as one). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = variant === "primary" ? "lg" : "md",
): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

const FIELD_BASE =
  "rounded-xl border border-black/15 bg-white text-base text-black placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

/**
 * Text input / select. `text-base` (16px) is deliberate: iOS Safari zooms the
 * page when focusing a field with a smaller font.
 */
export const inputClass = cx(FIELD_BASE, "h-11 w-full px-3");

/** Multi-line text field. */
export const textareaClass = cx(FIELD_BASE, "w-full px-3 py-2");

/** Compact select for inline row controls (still 16px text, see inputClass). */
export const compactSelectClass = cx(FIELD_BASE, "h-10 px-2");

/** Frosted card surface used for every list row, tile and panel. */
export const cardClass = "card-surface rounded-2xl";

/** Emphasized inline text link (inside a sentence or empty state). */
export const linkClass =
  "font-medium text-black underline underline-offset-4 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300";

/** Low-emphasis navigation link ("View all →", "← Back", "Sign out"). */
export const mutedLinkClass =
  "text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200";

/** Link styling for a name that navigates (player names in lists/cards). */
export const nameLinkClass = "underline-offset-4 hover:underline";

/** Selected-state fill shared by chips, segmented controls and switchers. */
export const selectedFillClass =
  "bg-black text-white dark:bg-zinc-50 dark:text-black";

export type BadgeTone = "neutral" | "durak" | "success" | "warning";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-black/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  durak: "badge-durak",
  success:
    "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  warning:
    "bg-amber-500/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
};

/** Tone colors only — for badges with a custom shape (e.g. form dots). */
export function badgeToneClass(tone: BadgeTone): string {
  return BADGE_TONES[tone];
}

/** Small pill label (status, role, outcome). */
export function badgeClass(tone: BadgeTone = "neutral"): string {
  return cx(
    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
    BADGE_TONES[tone],
  );
}

/** One segment of a segmented control (theme picker, period filters). */
export function segmentClass(active: boolean): string {
  return cx(
    "flex-1 whitespace-nowrap rounded-xl px-1 py-2 text-center text-xs font-medium transition-colors",
    active
      ? selectedFillClass
      : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50",
  );
}
