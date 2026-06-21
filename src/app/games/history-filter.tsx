import { SegmentedToggle } from "@/components/segmented-toggle";
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
 * Look-back window selector for the history list. Selecting a period navigates
 * to `?period=`; the server component reads + re-validates it. The default
 * period is left out of the URL to keep it clean. Shares the stats pages'
 * segmented control (`SegmentedToggle`).
 */
export function HistoryFilter({ period }: { period: HistoryPeriod }) {
  return (
    <SegmentedToggle
      ariaLabel="Filter by period"
      items={HISTORY_PERIODS.map((p) => ({
        label: LABELS[p],
        href: p === DEFAULT_HISTORY_PERIOD ? "/games" : `/games?period=${p}`,
        active: p === period,
      }))}
    />
  );
}
