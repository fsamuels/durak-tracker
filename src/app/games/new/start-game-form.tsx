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

  const q = search.trim().toLowerCase();
  // The main list shows only who's in the game. The search surfaces players from
  // the roster who aren't in yet, so you add rather than wade through everyone.
  const selectedIndices = fields
    .map((_, i) => i)
    .filter((i) => rows[i]?.selected);
  const searchMatches =
    q === ""
      ? []
      : fields
          .map((_, i) => i)
          .filter(
            (i) =>
              !rows[i]?.selected &&
              fields[i].displayName.toLowerCase().includes(q),
          );

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

        {/* In the game */}
        {selectedIndices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {selectedIndices.map((i) => (
              <li
                key={fields[i].id}
                className="card-surface flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
              >
                <span className="text-black dark:text-zinc-50">
                  {fields[i].displayName}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setValue(`rows.${i}.selected`, false, { shouldDirty: true })
                  }
                  aria-label={`Remove ${fields[i].displayName}`}
                  className="shrink-0 text-sm font-medium text-zinc-500 underline-offset-4 hover:text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">
            No players yet — search to add them.
          </p>
        )}

        {/* Search the roster to add more players */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players to add…"
          aria-label="Search players to add"
          autoComplete="off"
          className={inputClass}
        />

        {q !== "" &&
          (searchMatches.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {searchMatches.map((i) => (
                <li key={fields[i].id}>
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`rows.${i}.selected`, true, {
                        shouldDirty: true,
                      });
                      setSearch("");
                    }}
                    className="card-surface flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:brightness-95 active:brightness-90"
                  >
                    <span className="text-black dark:text-zinc-50">
                      {fields[i].displayName}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-emerald-600">
                      + Add
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              No players match “{search}”.
            </p>
          ))}

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
