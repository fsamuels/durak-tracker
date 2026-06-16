"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import {
  finishGameFormSchema,
  finishRowsToParticipants,
  OUTCOMES,
  OUTCOME_LABELS,
  outcomeCountError,
  TRUMP_SUITS,
  TRUMP_SUIT_LABELS,
  type FinishGameFormValues,
  type FinishGamePayload,
} from "@/lib/validation/game";

import { finishGameAction } from "./actions";

type Player = { id: string; display_name: string };

export function FinishGameForm({
  gameId,
  players,
  startedPlayerIds,
  initialTrumpSuit,
  initialDeckCount,
  initialNotes,
}: {
  gameId: string;
  players: Player[];
  /** player_ids already on the roster from the start step (pre-selected). */
  startedPlayerIds: string[];
  initialTrumpSuit: string;
  initialDeckCount: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const started = new Set(startedPlayerIds);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FinishGameFormValues>({
    resolver: zodResolver(finishGameFormSchema),
    defaultValues: {
      trumpSuit: initialTrumpSuit,
      deckCount: initialDeckCount,
      notes: initialNotes,
      rows: players.map((p) => ({
        playerId: p.id,
        displayName: p.display_name,
        selected: started.has(p.id),
        outcome: "none" as const,
      })),
    },
  });

  const { fields } = useFieldArray({ control, name: "rows" });
  const rows = useWatch({ control, name: "rows" }) ?? [];
  const selected = rows.filter((r) => r.selected);
  const liveError = outcomeCountError({
    total: selected.length,
    durak: selected.filter((r) => r.outcome === "durak").length,
    firstOut: selected.filter((r) => r.outcome === "first_out").length,
    lastOut: selected.filter((r) => r.outcome === "last_out").length,
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload: FinishGamePayload = {
      trumpSuit: values.trumpSuit
        ? (values.trumpSuit as FinishGamePayload["trumpSuit"])
        : null,
      deckCount: values.deckCount.trim() ? Number(values.deckCount) : null,
      notes: values.notes.trim() ? values.notes.trim() : null,
      participants: finishRowsToParticipants(values.rows),
    };

    const res = await finishGameAction(gameId, payload);
    if (res?.error) {
      setError("root", { message: res.error });
      return;
    }
    router.refresh();
  });

  const inputClass =
    "h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-500">
          Players &amp; result
        </legend>
        {fields.map((field, i) => {
          const isSelected = rows[i]?.selected;
          return (
            <div
              key={field.id}
              className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-zinc-900"
            >
              <input type="hidden" {...register(`rows.${i}.playerId`)} />
              <input type="hidden" {...register(`rows.${i}.displayName`)} />
              <label className="flex flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  {...register(`rows.${i}.selected`)}
                  className="size-5"
                />
                <span className="text-black dark:text-zinc-50">
                  {field.displayName}
                </span>
              </label>
              <select
                {...register(`rows.${i}.outcome`)}
                disabled={!isSelected}
                aria-label={`${field.displayName} outcome`}
                className="h-9 rounded-md border border-black/15 bg-white px-2 text-sm text-black disabled:opacity-40 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {OUTCOME_LABELS[o]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <p
          className={`text-sm ${liveError ? "text-red-600" : "text-emerald-600"}`}
          role={liveError ? "alert" : undefined}
        >
          {liveError ?? `${selected.length} players · ready to finish ✓`}
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

      <button
        type="submit"
        disabled={isSubmitting || !!liveError}
        className="btn-brand h-12 rounded-full px-5 text-base font-semibold"
      >
        {isSubmitting ? "Saving…" : "Finish game"}
      </button>

      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}
    </form>
  );
}
