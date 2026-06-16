import { z } from "zod";

import type { Enums } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Enums / labels
// ---------------------------------------------------------------------------

export type TrumpSuit = Enums<"trump_suit">;

export const TRUMP_SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
// Compile-time guard that the literal list stays in sync with the DB enum.
const _suitInSync: TrumpSuit = TRUMP_SUITS[0];
void _suitInSync;

export const TRUMP_SUIT_LABELS: Record<TrumpSuit, string> = {
  hearts: "♥ Hearts",
  diamonds: "♦ Diamonds",
  clubs: "♣ Clubs",
  spades: "♠ Spades",
};

/** Per-player outcome in a game. A player holds at most one role (DB CHECK). */
export const OUTCOMES = ["none", "durak", "first_out", "last_out"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_LABELS: Record<Outcome, string> = {
  none: "—",
  durak: "Durak 🃏",
  first_out: "First out",
  last_out: "Last out",
};

// ---------------------------------------------------------------------------
// Shared game-outcome invariants (mirror the DB integrity triggers)
// ---------------------------------------------------------------------------

/**
 * Validate the cross-player outcome rules enforced by the DB:
 *  - at least 3 players (heads-up Durak is out of scope),
 *  - exactly one durak,
 *  - at most one first-out and one last-out.
 * Returns a human-readable error, or null when valid.
 */
export function outcomeCountError(counts: {
  total: number;
  durak: number;
  firstOut: number;
  lastOut: number;
}): string | null {
  if (counts.total < 3) return "A game needs at least 3 players.";
  if (counts.durak !== 1) return "Exactly one player must be the durak.";
  if (counts.firstOut > 1) return "Only one player can be marked first out.";
  if (counts.lastOut > 1) return "Only one player can be marked last out.";
  return null;
}

function tally(outcomes: Outcome[]) {
  return {
    total: outcomes.length,
    durak: outcomes.filter((o) => o === "durak").length,
    firstOut: outcomes.filter((o) => o === "first_out").length,
    lastOut: outcomes.filter((o) => o === "last_out").length,
  };
}

// ---------------------------------------------------------------------------
// Client form schema (one row per group player; only "selected" rows count)
// ---------------------------------------------------------------------------

const rowSchema = z.object({
  playerId: z.string(),
  displayName: z.string(),
  selected: z.boolean(),
  outcome: z.enum(OUTCOMES),
});

export const logGameFormSchema = z
  .object({
    startedAt: z.string().min(1, "Start time is required."),
    endedAt: z.string(),
    trumpSuit: z.string(),
    deckCount: z.string(),
    notes: z.string().max(2000, "Notes are too long."),
    rows: z.array(rowSchema),
  })
  .refine(
    (d) => {
      const v = d.deckCount.trim();
      return v === "" || (/^\d+$/.test(v) && Number(v) > 0);
    },
    {
      message: "Deck count must be a positive whole number.",
      path: ["deckCount"],
    },
  )
  .refine(
    (d) => d.endedAt === "" || Date.parse(d.endedAt) >= Date.parse(d.startedAt),
    { message: "End time can't be before the start time.", path: ["endedAt"] },
  )
  .superRefine((d, ctx) => {
    const selected = d.rows.filter((r) => r.selected);
    const err = outcomeCountError(tally(selected.map((r) => r.outcome)));
    if (err) ctx.addIssue({ code: "custom", message: err, path: ["rows"] });
  });

export type LogGameFormValues = z.infer<typeof logGameFormSchema>;

// ---------------------------------------------------------------------------
// Server payload schema (what the server action re-validates and persists)
// ---------------------------------------------------------------------------

const participantSchema = z.object({
  playerId: z.uuid(),
  isDurak: z.boolean(),
  isFirstOut: z.boolean(),
  isLastOut: z.boolean(),
});

const isoInstant = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid timestamp.");

export const logGamePayloadSchema = z
  .object({
    startedAt: isoInstant,
    endedAt: isoInstant.nullable(),
    trumpSuit: z.enum(TRUMP_SUITS).nullable(),
    deckCount: z.number().int().positive().nullable(),
    notes: z.string().nullable(),
    participants: z.array(participantSchema),
  })
  .refine(
    (d) =>
      d.endedAt === null || Date.parse(d.endedAt) >= Date.parse(d.startedAt),
    { message: "End time can't be before the start time.", path: ["endedAt"] },
  )
  .superRefine((d, ctx) => {
    const err = outcomeCountError({
      total: d.participants.length,
      durak: d.participants.filter((p) => p.isDurak).length,
      firstOut: d.participants.filter((p) => p.isFirstOut).length,
      lastOut: d.participants.filter((p) => p.isLastOut).length,
    });
    if (err)
      ctx.addIssue({ code: "custom", message: err, path: ["participants"] });
  });

export type LogGamePayload = z.infer<typeof logGamePayloadSchema>;

// ---------------------------------------------------------------------------
// Form -> payload helpers
// ---------------------------------------------------------------------------

export function rowsToParticipants(
  rows: LogGameFormValues["rows"],
): LogGamePayload["participants"] {
  return rows
    .filter((r) => r.selected)
    .map((r) => ({
      playerId: r.playerId,
      isDurak: r.outcome === "durak",
      isFirstOut: r.outcome === "first_out",
      isLastOut: r.outcome === "last_out",
    }));
}

/** A `datetime-local` value is browser wall-clock; convert to a UTC instant. */
export function localToIso(local: string): string | null {
  if (!local) return null;
  const ms = Date.parse(local);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
