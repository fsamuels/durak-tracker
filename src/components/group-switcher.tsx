import { switchGroup } from "@/app/actions";
import { cx, selectedFillClass } from "@/lib/ui";

export type SwitchableGroup = { id: string; name: string };

/**
 * Inline tap-to-switch list of the user's groups, shown at the top of the Manage
 * group page. Each row posts to the `switchGroup` server action, which stores the
 * choice in the active-group cookie and redirects home. The active group is shown
 * highlighted and non-interactive.
 */
export function GroupSwitcher({
  groups,
  currentGroupId,
}: {
  groups: SwitchableGroup[];
  currentGroupId: string | undefined;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {groups.map((g) => {
        const active = g.id === currentGroupId;
        return (
          <li key={g.id}>
            <form action={switchGroup}>
              <input type="hidden" name="groupId" value={g.id} />
              <button
                type="submit"
                disabled={active}
                aria-current={active ? "true" : undefined}
                className={cx(
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition",
                  active
                    ? `border border-transparent ${selectedFillClass}`
                    : "card-surface text-black hover:brightness-95 active:brightness-90 dark:text-zinc-50",
                )}
              >
                <span className="truncate text-sm font-medium">{g.name}</span>
                <span className="shrink-0 text-xs">
                  {active ? "Current" : "Switch →"}
                </span>
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
