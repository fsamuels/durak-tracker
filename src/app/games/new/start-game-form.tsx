"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AddGuestInline } from "@/components/add-guest-inline";
import {
  startGameFormSchema,
  startRowsToParticipants,
  TRUMP_SUITS,
  TRUMP_SUIT_LABELS,
  type StartGameFormValues,
  type StartGamePayload,
} from "@/lib/validation/game";

import { startGameAction } from "./actions";

type Player = { id: string; display_name: string };

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
  const [search, setSearch] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setError,
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

  const q = search.trim().toLowerCase();
  // Show a row when it matches the search, or when it's selected (so filtering
  // never hides who's already in) — and everything when the search is empty.
  const isVisible = (i: number) =>
    q === "" ||
    rows[i]?.selected ||
    fields[i].displayName.toLowerCase().includes(q);
  const anyVisible = fields.some((_, i) => isVisible(i));

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

  const inputClass =
    "h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-500">
          Who&apos;s playing?
        </legend>

        {players.length > 6 && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            aria-label="Search players"
            autoComplete="off"
            className={inputClass}
          />
        )}

        {fields.map((field, i) => (
          <label
            key={field.id}
            hidden={!isVisible(i)}
            className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-zinc-900"
          >
            <input type="hidden" {...register(`rows.${i}.playerId`)} />
            <input type="hidden" {...register(`rows.${i}.displayName`)} />
            <input
              type="checkbox"
              {...register(`rows.${i}.selected`)}
              className="size-5"
            />
            <span className="text-black dark:text-zinc-50">
              {field.displayName}
            </span>
          </label>
        ))}

        {q !== "" && !anyVisible && (
          <p className="text-sm text-zinc-500">No players match “{search}”.</p>
        )}

        <AddGuestInline
          onAdded={(player) => {
            append({
              playerId: player.id,
              displayName: player.display_name,
              selected: true,
            });
            setSearch("");
          }}
        />

        <p
          className={`text-sm ${selectedCount === 0 ? "text-red-600" : "text-emerald-600"}`}
          role={selectedCount === 0 ? "alert" : undefined}
        >
          {selectedCount === 0
            ? "Pick at least one player to start."
            : `${selectedCount} ${selectedCount === 1 ? "player" : "players"} in · you can add more when you finish`}
        </p>
        {errors.rows && (
          <p role="alert" className="text-sm text-red-600">
            {errors.rows.message}
          </p>
        )}
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

      <button
        type="submit"
        disabled={isSubmitting || selectedCount === 0}
        className="btn-brand h-12 rounded-full px-5 text-base font-semibold"
      >
        {isSubmitting ? "Starting…" : "Start game"}
      </button>

      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}
    </form>
  );
}
