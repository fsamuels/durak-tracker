import { switchGroup } from "@/app/actions";

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
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                  active
                    ? "border border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                    : "card-surface text-black hover:brightness-95 active:brightness-90 dark:text-zinc-50"
                }`}
              >
                <span className="font-medium">{g.name}</span>
                <span className="text-xs">{active ? "current" : "Switch"}</span>
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
