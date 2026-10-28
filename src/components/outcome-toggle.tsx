import { badgeToneClass, cx, type BadgeTone } from "@/lib/ui";
import {
  OUTCOME_ROLES,
  type Outcome,
  type OutcomeRole,
} from "@/lib/validation/game";

const ROLE_LABELS: Record<OutcomeRole, string> = {
  durak: "Durak 🃏",
  first_out: "1st out",
  last_out: "Last out",
};

const ROLE_TONES: Record<OutcomeRole, BadgeTone> = {
  durak: "durak",
  first_out: "success",
  last_out: "warning",
};

/**
 * One-tap outcome picker for a player row on the Finish / Edit game forms:
 * three toggle buttons (Durak · 1st out · Last out). The caller decides what a
 * tap means; the forms use `assignOutcome`, so tapping the active role clears it
 * and tapping a role someone else holds moves it here. Active buttons take the
 * same tone as that outcome's badge elsewhere in the app.
 */
export function OutcomeToggle({
  name,
  value,
  onSelect,
}: {
  /** Player name, for the group's accessible label. */
  name: string;
  value: Outcome;
  onSelect: (role: OutcomeRole) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`${name} outcome`}
      className="flex gap-1 rounded-xl bg-black/[0.04] p-1 dark:bg-white/5"
    >
      {OUTCOME_ROLES.map((role) => {
        const active = value === role;
        return (
          <button
            key={role}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(role)}
            className={cx(
              "h-9 flex-1 whitespace-nowrap rounded-lg px-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
              active
                ? cx(badgeToneClass(ROLE_TONES[role]), "font-semibold")
                : "font-medium text-zinc-500 hover:bg-black/5 hover:text-black dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50",
            )}
          >
            {ROLE_LABELS[role]}
          </button>
        );
      })}
    </div>
  );
}
