import { Section, StatTile } from "@/components/ui";
import type { SystemStats } from "@/lib/data/system";
import { cardClass, cx } from "@/lib/ui";

import { ErrorCard } from "./cards";

/** One label/value line in the insights card. */
function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-black dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}

/**
 * System-wide overview: at-a-glance totals plus a few derived insights (recent
 * activity, the most active group). Always expanded — it's the page's summary.
 */
export function SystemStats({
  stats,
  error,
}: {
  stats: SystemStats | null;
  error: string | null;
}) {
  return (
    <Section title="System overview">
      {error || !stats ? (
        <ErrorCard
          title="Failed to load system stats"
          detail={error ?? "No data returned."}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Groups"
              value={stats.totalGroups.toLocaleString()}
            />
            <StatTile
              label="Registered users"
              value={stats.totalUsers.toLocaleString()}
              sub={
                stats.newUsers7d > 0
                  ? `+${stats.newUsers7d} this week`
                  : undefined
              }
            />
            <StatTile
              label="Players"
              value={stats.totalPlayers.toLocaleString()}
              sub={`${stats.guestPlayers} ${stats.guestPlayers === 1 ? "guest" : "guests"}`}
            />
            <StatTile
              label="Games"
              value={stats.completedGames.toLocaleString()}
              sub={
                stats.totalGames > stats.completedGames
                  ? `${stats.totalGames - stats.completedGames} in progress`
                  : undefined
              }
            />
          </div>

          <div className={cx(cardClass, "flex flex-col gap-2 px-4 py-3")}>
            <InsightRow
              label="Games this week"
              value={`${stats.games7d} across ${stats.activeGroups7d} ${
                stats.activeGroups7d === 1 ? "group" : "groups"
              }`}
            />
            <InsightRow
              label="Games this month"
              value={stats.games30d.toLocaleString()}
            />
            <InsightRow
              label="Most active group"
              value={
                stats.topGroupName
                  ? `${stats.topGroupName} (${stats.topGroupGames})`
                  : "—"
              }
            />
          </div>
        </>
      )}
    </Section>
  );
}
