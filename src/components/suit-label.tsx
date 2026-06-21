import {
  TRUMP_SUIT_NAMES,
  TRUMP_SUIT_SYMBOLS,
  type TrumpSuit,
} from "@/lib/validation/game";

/**
 * Renders a trump suit as a large, color-coded pip symbol followed by its name.
 * Hearts/diamonds are red (the playing-card convention); clubs/spades use the
 * theme's foreground color so they stay legible in both light and dark mode.
 */
const SUIT_COLOR: Record<TrumpSuit, string> = {
  hearts: "text-red-600 dark:text-red-500",
  diamonds: "text-red-600 dark:text-red-500",
  clubs: "text-black dark:text-zinc-50",
  spades: "text-black dark:text-zinc-50",
};

export function SuitLabel({
  suit,
  symbolClassName = "text-2xl",
}: {
  suit: TrumpSuit;
  /** Tailwind size class for the pip (default `text-2xl`). */
  symbolClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className={`${SUIT_COLOR[suit]} ${symbolClassName} leading-none`}
      >
        {TRUMP_SUIT_SYMBOLS[suit]}
      </span>
      <span>{TRUMP_SUIT_NAMES[suit]}</span>
    </span>
  );
}
