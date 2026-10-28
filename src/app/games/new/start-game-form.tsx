"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AddGuestInline } from "@/components/add-guest-inline";
import { PlayerChipGrid } from "@/components/player-chip-grid";
import { Field, FormMessage } from "@/components/ui";
import { buttonClass, inputClass, textareaClass } from "@/lib/ui";
import {
  startGameFormSchema,
  startRowsToParticipants,
  TRUMP_SUITS,
  TRUMP_SUIT_LABELS,
  type StartGameFormValues,
  type StartGamePayload,
} from "@/lib/validation/game";

import { startGameAction } from "./actions";

type Player = { id: string; display_name: string; avatar_url?: string | null };

export function StartGameForm({
  players,
  preselectedIds = [],
}: {
  /** Group roster, already ranked by games-played desc (see getGroupRoster). */
  players: Player[];
  /** Players to pre-select — e.g. a prior game's roster via "Start again". */
  preselectedIds?: string[];
}) {
  const preselected = new Set(preselectedIds);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StartGameFormValues>({
    resolver: zodResolver(startGameFormSchema),
    defaultValues: {
      trumpSuit: "",
      deckCount: "",
      notes: "",
      rows: players.map((p) => ({
        playerId: p.id,
        displayName: p.display_name,
        selected: preselected.has(p.id),
      })),
    },
  });

  const { fields, append } = useFieldArray({ control, name: "rows" });
  const rows = useWatch({ control, name: "rows" }) ?? [];
  const selectedCount = rows.filter((r) => r.selected).length;

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

  const onSubmit = handleSubmit(async (values) => {
    const payload: StartGamePayload = {
      trumpSuit: values.trumpSuit
        ? (values.trumpSuit as StartGamePayload["trumpSuit"])
        : null,
      deckCount: values.deckCount.trim() ? Number(values.deckCount) : null,
      notes: values.notes.trim() ? values.notes.trim() : null,
      participants: startRowsToParticipants(values.rows),
    };

    const res = await startGameAction(payload);
    if (res?.error) setError("root", { message: res.error });
    // On success the action redirects; nothing to do here.
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-500">
          Who&apos;s playing?
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

        <AddGuestInline
          onAdded={(player) => {
            append({
              playerId: player.id,
              displayName: player.display_name,
              selected: true,
            });
          }}
        />

        <p
          className={`text-sm ${selectedCount === 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
          role={selectedCount === 0 ? "alert" : undefined}
        >
          {selectedCount === 0
            ? "Pick at least one player to start."
            : `${selectedCount} ${selectedCount === 1 ? "player" : "players"} in · you can add more when you finish`}
        </p>
        {errors.rows && <FormMessage>{errors.rows.message}</FormMessage>}
      </fieldset>

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
        disabled={isSubmitting || selectedCount === 0}
        className={buttonClass("primary")}
      >
        {isSubmitting ? "Starting…" : "Start game"}
      </button>

      {errors.root && <FormMessage>{errors.root.message}</FormMessage>}
    </form>
  );
}
