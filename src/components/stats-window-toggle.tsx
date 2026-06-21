import { SegmentedToggle } from "@/components/segmented-toggle";
import {
  STATS_WINDOWS,
  WINDOW_LABELS,
  type StatsWindow,
} from "@/lib/validation/stats";

/**
 * Segmented control for the stat time-window (all-time / week / month / year).
 * Selecting a window navigates to `?window=…`, which re-runs the RPC server-side
 * with the matching `p_window` (group-timezone bucketed).
 */
export function StatsWindowToggle({
  basePath,
  current,
}: {
  basePath: string;
  current: StatsWindow;
}) {
  return (
    <SegmentedToggle
      ariaLabel="Time period"
      items={STATS_WINDOWS.map((w) => ({
        label: WINDOW_LABELS[w],
        href: w === "all" ? basePath : `${basePath}?window=${w}`,
        active: w === current,
      }))}
    />
  );
}
