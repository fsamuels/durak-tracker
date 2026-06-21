import Link from "next/link";

import {
  STATS_WINDOWS,
  WINDOW_LABELS,
  type StatsWindow,
} from "@/lib/validation/stats";

/**
 * Segmented control for the stat time-window (all-time / week / month / year).
 * Rendered as links so the stats pages stay server components — selecting a
 * window is a navigation to `?window=…`, which re-runs the RPC server-side with
 * the matching `p_window` (group-timezone bucketed).
 */
export function StatsWindowToggle({
  basePath,
  current,
}: {
  basePath: string;
  current: StatsWindow;
}) {
  return (
    <div
      role="tablist"
      aria-label="Time period"
      className="card-surface flex gap-1 rounded-2xl p-1"
    >
      {STATS_WINDOWS.map((w) => {
        const active = w === current;
        const href = w === "all" ? basePath : `${basePath}?window=${w}`;
        return (
          <Link
            key={w}
            href={href}
            role="tab"
            aria-selected={active}
            scroll={false}
            className={`flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-medium transition-colors ${
              active
                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            }`}
          >
            {WINDOW_LABELS[w]}
          </Link>
        );
      })}
    </div>
  );
}
