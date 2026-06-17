"use client";

import { useRouter } from "next/navigation";

import {
  DEFAULT_HISTORY_PERIOD,
  HISTORY_PERIODS,
  type HistoryPeriod,
} from "@/lib/validation/history";

const LABELS: Record<HistoryPeriod, string> = {
  week: "Past week",
  month: "Past month",
  all: "All time",
};

/**
 * Look-back window selector for the history list. Pushes the chosen period to
 * the URL as `?period=`; the server component reads + re-validates it. The
 * default period is left out of the URL to keep it clean.
 */
export function HistoryFilter({ period }: { period: HistoryPeriod }) {
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label="Filter by period"
      className="flex flex-wrap gap-2"
    >
      {HISTORY_PERIODS.map((p) => {
        const active = p === period;
        return (
          <button
            key={p}
            type="button"
            aria-pressed={active}
            onClick={() =>
              router.push(
                p === DEFAULT_HISTORY_PERIOD ? "/games" : `/games?period=${p}`,
              )
            }
            className={
              active
                ? "h-9 rounded-full bg-black px-4 text-sm font-medium text-white dark:bg-zinc-50 dark:text-black"
                : "h-9 rounded-full border border-black/15 px-4 text-sm font-medium text-zinc-600 transition-colors hover:border-black/30 hover:text-black dark:border-white/15 dark:text-zinc-400 dark:hover:border-white/30 dark:hover:text-zinc-50"
            }
          >
            {LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
