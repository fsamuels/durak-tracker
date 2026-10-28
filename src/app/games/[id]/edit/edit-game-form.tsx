"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AddGuestInline } from "@/components/add-guest-inline";
import { Avatar } from "@/components/avatar";
import { OutcomeToggle } from "@/components/outcome-toggle";
import { PlayerChipGrid } from "@/components/player-chip-grid";
import { Field, FormMessage } from "@/components/ui";
import {
  buttonClass,
  cardClass,
  cx,
  inputClass,
  textareaClass,
} from "@/lib/ui";
import {
  editGameFormSchema,
  finishRowsToParticipants,
  assignOutcome,
  outcomeCountError,
  TRUMP_SUITS,
  TRUMP_SUIT_LABELS,
  type EditGameFormValues,
  type EditGamePayload,
  type Outcome,
  type OutcomeRole,
} from "@/lib/validation/game";

import { deleteGameAction, editGameAction } from "./actions";

type Player = { id: string; display_name: string; avatar_url?: string | null };

export function EditGameForm({
  gameId,
  players,
  startedPlayerIds,
  initialOutcomes,
  initialTrumpSuit,
  initialDeckCount,
  initialNotes,
  initialStartedAt,
  initialEndedAt,
}: {
  gameId: string;
  players: Player[];
  startedPlayerIds: string[];
  initialOutcomes: Record<string, Outcome>;
  initialTrumpSuit: string;
  initialDeckCount: string;
  initialNotes: string;
  initialStartedAt: string;
  initialEndedAt: string;
}) {
  const started = new Set(startedPlayerIds);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditGameFormValues>({
    resolver: zodResolver(editGameFormSchema),
    defaultValues: {
      startedAt: initialStartedAt,
      endedAt: initialEndedAt,
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

  // One tap per outcome: a role moves to the tapped player (clearing whoever
  // held it), and tapping a player's current role clears it.
  const selectOutcome = (i: number, role: OutcomeRole) => {
    const current = fields.map((_, j) => rows[j]?.outcome ?? "none");
    assignOutcome(current, i, role).forEach((outcome, j) => {
      if (outcome !== current[j]) {
        setValue(`rows.${j}.outcome`, outcome, { shouldDirty: true });
      }
    });
  };

  const buildPayload = (values: EditGameFormValues): EditGamePayload => ({
    gameId,
    startedAt: values.startedAt,
    endedAt: values.endedAt,
    trumpSuit: values.trumpSuit
      ? (values.trumpSuit as EditGamePayload["trumpSuit"])
      : null,
    deckCount: values.deckCount.trim() ? Number(values.deckCount) : null,
    notes: values.notes.trim() ? values.notes.trim() : null,
    participants: finishRowsToParticipants(values.rows),
  });

  const onSave = handleSubmit(async (values) => {
    if (liveError) {
      setError("root", { message: liveError });
      return;
    }
    setSaving(true);
    const res = await editGameAction(gameId, buildPayload(values));
    if (res?.error) {
      setError("root", { message: res.error });
      setSaving(false);
      return;
    }
    // editGameAction redirects on success.
  });

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this game? It will be hidden from history and stats and can't be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await deleteGameAction(gameId);
    if (res?.error) {
      setError("root", { message: res.error });
      setDeleting(false);
    }
    // deleteGameAction redirects on success.
  }

  return (
    <form onSubmit={onSave} className="flex flex-col gap-6">
      {/* Timestamps */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start time" error={errors.startedAt?.message}>
          <input
            type="datetime-local"
            {...register("startedAt")}
            className={inputClass}
          />
        </Field>

        <Field label="End time" error={errors.endedAt?.message}>
          <input
            type="datetime-local"
            {...register("endedAt")}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Players & outcomes */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-500">
          Players &amp; result
        </legend>

        {/* Hidden inputs keep every row registered so RHF tracks all state. */}
        <div hidden aria-hidden>
          {fields.map((field, i) => (
            <span key={field.id}>
              <input type="hidden" {...register(`rows.${i}.playerId`)} />
              <input type="hidden" {...register(`rows.${i}.displayName`)} />
              <input type="checkbox" {...register(`rows.${i}.selected`)} />
              <input type="hidden" {...register(`rows.${i}.outcome`)} />
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
                className={cx(cardClass, "flex flex-col gap-2 px-4 py-2.5")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={avatarById.get(fields[i].playerId)}
                    name={fields[i].displayName}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-black dark:text-zinc-50">
                    {fields[i].displayName}
                  </span>
                </div>
                <OutcomeToggle
                  name={fields[i].displayName}
                  value={rows[i]?.outcome ?? "none"}
                  onSelect={(role) => selectOutcome(i, role)}
                />
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
          className={`text-sm ${liveError ? "text-zinc-500" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {liveError
            ? `${selected.length} ${selected.length === 1 ? "player" : "players"} · ${liveError}`
            : `${selected.length} players · ready to save ✓`}
        </p>
      </fieldset>

      {/* Game details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Trump suit" optional>
          <select {...register("trumpSuit")} className={inputClass}>
            <option value="">—</option>
            {TRUMP_SUITS.map((s) => (
              <option key={s} value={s}>
                {TRUMP_SUIT_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Deck count" optional error={errors.deckCount?.message}>
          <input
            inputMode="numeric"
            placeholder="e.g. 1"
            {...register("deckCount")}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notes" optional error={errors.notes?.message}>
        <textarea {...register("notes")} rows={2} className={textareaClass} />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting || deleting || saving}
        className={buttonClass("primary")}
      >
        {saving ? "Saving…" : "Save changes"}
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={isSubmitting || deleting || saving}
        className={buttonClass("danger")}
      >
        {deleting ? "Deleting…" : "Delete game"}
      </button>

      {errors.root && <FormMessage>{errors.root.message}</FormMessage>}
    </form>
  );
}
