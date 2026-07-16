"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AddGuestInline } from "@/components/add-guest-inline";
import { PlayerChipGrid } from "@/components/player-chip-grid";
import {
  inProgressGameFormSchema,
  finishRowsToParticipants,
  OUTCOMES,
  OUTCOME_LABELS,
  outcomeCountError,
  TRUMP_SUITS,
  TRUMP_SUIT_LABELS,
  type InProgressGameFormValues,
  type FinishGamePayload,
  type Outcome,
} from "@/lib/validation/game";

import {
  discardGameAction,
  finishGameAction,
  updateGameAction,
} from "./actions";

type Player = { id: string; display_name: string; avatar_url?: string | null };

export function FinishGameForm({
  gameId,
  players,
  startedPlayerIds,
  initialOutcomes,
  initialTrumpSuit,
  initialDeckCount,
  initialNotes,
}: {
  gameId: string;
  /** Group roster, already ranked by games-played desc (see getGroupRoster). */
  players: Player[];
  /** player_ids already on the roster from the start step (pre-selected). */
  startedPlayerIds: string[];
  /** Outcome per player saved so far (e.g. a first-out marked mid-play). */
  initialOutcomes: Record<string, Outcome>;
  initialTrumpSuit: string;
  initialDeckCount: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const started = new Set(startedPlayerIds);
  const [discarding, setDiscarding] = useState(false);
  // Which submit is in flight, so the right button shows its pending label.
  const [pending, setPending] = useState<null | "save" | "finish">(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InProgressGameFormValues>({
    resolver: zodResolver(inProgressGameFormSchema),
    defaultValues: {
      trumpSuit: initialTrumpSuit,
      deckCount: initialDeckCount,
      notes: initialNotes,
      rows: players.map((p) => ({
        playerId: p.id,
        displayName: p.display_name,
        selected: started.has(p.id),
        outcome: initialOutcomes[p.id] ?? ("none" as const),
      })),
    },
  });

  const { fields, append } = useFieldArray({ control, name: "rows" });
  const rows = useWatch({ control, name: "rows" }) ?? [];
  const selected = rows.filter((r) => r.selected);
  const liveError = outcomeCountError({
    total: selected.length,
    durak: selected.filter((r) => r.outcome === "durak").length,
    firstOut: selected.filter((r) => r.outcome === "first_out").length,
    lastOut: selected.filter((r) => r.outcome === "last_out").length,
  });

  // The chip grid handles who's-in selection; the result list below shows the
  // selected players with their outcome controls.
  const selectedIndices = fields
    .map((_, i) => i)
    .filter((i) => rows[i]?.selected);

  // Derive the chip grid's roster + selection from the RHF field array. Avatars
  // come from the incoming roster; appended guests fall back to initials.
  const avatarById = new Map(players.map((p) => [p.id, p.avatar_url ?? null]));
  const chipPlayers = fields.map((f) => ({
    id: f.playerId,
    display_name: f.displayName,
    avatar_url: avatarById.get(f.playerId) ?? null,
  }));
  const indexById = new Map(fields.map((f, i) => [f.playerId, i]));
  const selectedIds = new Set(
    fields.filter((_, i) => rows[i]?.selected).map((f) => f.playerId),
  );
  const toggle = (id: string) => {
    const i = indexById.get(id);
    if (i === undefined) return;
    setValue(`rows.${i}.selected`, !rows[i]?.selected, { shouldDirty: true });
  };

  // Both submits share the same payload shape; only the action differs.
  const buildPayload = (
    values: InProgressGameFormValues,
  ): FinishGamePayload => ({
    trumpSuit: values.trumpSuit
      ? (values.trumpSuit as FinishGamePayload["trumpSuit"])
      : null,
    deckCount: values.deckCount.trim() ? Number(values.deckCount) : null,
    notes: values.notes.trim() ? values.notes.trim() : null,
    participants: finishRowsToParticipants(values.rows),
  });

  // Save progress without finishing. The loose resolver already guards this
  // (>= 1 player, at most one of each role); no durak is required yet.
  const onSave = handleSubmit(async (values) => {
    setPending("save");
    setSaved(false);
    const res = await updateGameAction(gameId, buildPayload(values));
    if (res?.error) {
      setError("root", { message: res.error });
      setPending(null);
      return;
    }
    setPending(null);
    setSaved(true);
    router.refresh();
  });

  // Finish the game. Re-check the strict completed-game rules (the Finish
  // button is already disabled on liveError; this also guards Enter-to-submit).
  const onFinish = handleSubmit(async (values) => {
    if (liveError) {
      setError("root", { message: liveError });
      return;
    }
    setPending("finish");
    const res = await finishGameAction(gameId, buildPayload(values));
    if (res?.error) {
      setError("root", { message: res.error });
      setPending(null);
      return;
    }
    // finishGameAction redirects to /games on success.
  });

  async function onDiscard() {
    if (
      !window.confirm(
        "Discard this game? This permanently deletes it and can't be undone.",
      )
    ) {
      return;
    }
    setDiscarding(true);
    const res = await discardGameAction(gameId);
    if (res?.error) {
      setError("root", { message: res.error });
      setDiscarding(false);
    }
    // On success the action redirects home.
  }

  const inputClass =
    "h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form onSubmit={onFinish} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-500">
          Players &amp; result
        </legend>

        {/* Keep every row registered (hidden) so RHF tracks/submits each
            player's selected state regardless of what the list shows. */}
        <div hidden aria-hidden>
          {fields.map((field, i) => (
            <span key={field.id}>
              <input type="hidden" {...register(`rows.${i}.playerId`)} />
              <input type="hidden" {...register(`rows.${i}.displayName`)} />
              <input type="checkbox" {...register(`rows.${i}.selected`)} />
            </span>
          ))}
        </div>

        {/* Tap a chip to add/remove a player; search filters the grid. */}
        <PlayerChipGrid
          players={chipPlayers}
          selectedIds={selectedIds}
          onToggle={toggle}
          searchLabel="Search players"
          searchPlaceholder="Search players…"
        />

        {/* Result: an outcome control for each player who's in. */}
        {selectedIndices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {selectedIndices.map((i) => (
              <li
                key={fields[i].id}
                className="card-surface flex items-center gap-3 rounded-2xl px-3 py-2.5"
              >
                <span className="flex-1 text-black dark:text-zinc-50">
                  {fields[i].displayName}
                </span>
                <select
                  {...register(`rows.${i}.outcome`)}
                  aria-label={`${fields[i].displayName} outcome`}
                  className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o} value={o}>
                      {OUTCOME_LABELS[o]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            Tap a player above to add them.
          </p>
        )}

        <AddGuestInline
          onAdded={(player) => {
            append({
              playerId: player.id,
              displayName: player.display_name,
              selected: true,
              outcome: "none",
            });
          }}
        />

        <p
          className={`text-sm ${liveError ? "text-zinc-500" : "text-emerald-600"}`}
        >
          {liveError
            ? `${selected.length} ${selected.length === 1 ? "player" : "players"} · ${liveError}`
            : `${selected.length} players · ready to finish ✓`}
        </p>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Trump suit <span className="text-zinc-400">(optional)</span>
          <select {...register("trumpSuit")} className={inputClass}>
            <option value="">—</option>
            {TRUMP_SUITS.map((s) => (
              <option key={s} value={s}>
                {TRUMP_SUIT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Deck count <span className="text-zinc-400">(optional)</span>
          <input
            inputMode="numeric"
            placeholder="e.g. 1"
            {...register("deckCount")}
            className={inputClass}
          />
          {errors.deckCount && (
            <span className="text-sm font-normal text-red-600">
              {errors.deckCount.message}
            </span>
          )}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes <span className="text-zinc-400">(optional)</span>
        <textarea
          {...register("notes")}
          rows={2}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {errors.notes && (
          <span className="text-sm font-normal text-red-600">
            {errors.notes.message}
          </span>
        )}
      </label>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isSubmitting || discarding || !!liveError}
          className="btn-brand h-12 rounded-full px-5 text-base font-semibold"
        >
          {pending === "finish" ? "Finishing…" : "Finish game"}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting || discarding}
          className="h-11 rounded-full border border-black/15 px-5 text-sm font-medium text-black transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/15 dark:text-zinc-50 dark:hover:bg-white/10"
        >
          {pending === "save" ? "Saving…" : "Save changes"}
        </button>

        {saved && pending === null && (
          <p className="text-center text-sm text-emerald-600">
            Changes saved ✓
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDiscard}
        disabled={isSubmitting || discarding}
        className="h-11 rounded-full border border-red-500/30 px-5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
      >
        {discarding ? "Discarding…" : "Discard game"}
      </button>

      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}
    </form>
  );
}
