import type { GroupDetails } from "@/lib/data/groups";
import { formatDateInTz } from "@/lib/time";

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * At-a-glance facts about the active group — owner, creation date, timezone, and
 * member/player/game counts — shown at the top of the Manage group page. Purely
 * presentational; data is fetched by `getGroupDetails`.
 */
export function GroupDetails({ details }: { details: GroupDetails }) {
  const rows: { label: string; value: string }[] = [
    {
      label: "Owner",
      value: details.viewerIsOwner
        ? `You${details.ownerName ? ` (${details.ownerName})` : ""}`
        : (details.ownerName ?? "Unknown"),
    },
    {
      label: "Created",
      value: formatDateInTz(details.createdAt, details.timezone),
    },
    { label: "Timezone", value: details.timezone },
    { label: "Members", value: plural(details.memberCount, "member") },
    { label: "Players", value: plural(details.playerCount, "player") },
    { label: "Games", value: plural(details.gameCount, "game") },
  ];

  return (
    <section
      aria-label="Group details"
      className="card-surface flex flex-col gap-3 rounded-2xl px-4 py-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="truncate text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
          {details.name}
        </h2>
        {details.viewerIsOwner && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
            owner
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-zinc-500">{row.label}</dt>
            <dd className="text-black dark:text-zinc-50">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
