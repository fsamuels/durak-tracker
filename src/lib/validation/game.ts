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
 * Validate the cross-player outcome rules a COMPLETED game must satisfy (same as
 * the DB integrity trigger for completed games):
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
// Shared optional game-detail fields (trump / deck / notes)
// ---------------------------------------------------------------------------

const detailFormFields = {
  trumpSuit: z.string(),
  deckCount: z.string(),
  notes: z.string().max(2000, "Notes are too long."),
};

const deckCountFormCheck = (d: { deckCount: string }) => {
  const v = d.deckCount.trim();
  return v === "" || (/^\d+$/.test(v) && Number(v) > 0);
};

const detailPayloadFields = {
  trumpSuit: z.enum(TRUMP_SUITS).nullable(),
  deckCount: z.number().int().positive().nullable(),
  notes: z.string().nullable(),
};

// z.guid() not z.uuid(): the DB has non-version-conformant GUIDs (e.g. seed ids)
// that Zod 4's strict z.uuid() rejects, which would fail the RPC.
const playerId = z.guid();

// ---------------------------------------------------------------------------
// START — create an in-progress game with a roster (>= 1 player, no outcomes)
// ---------------------------------------------------------------------------

const startRowSchema = z.object({
  playerId: z.string(),
  displayName: z.string(),
  selected: z.boolean(),
});

export const startGameFormSchema = z
  .object({ ...detailFormFields, rows: z.array(startRowSchema) })
  .refine(deckCountFormCheck, {
    message: "Deck count must be a positive whole number.",
    path: ["deckCount"],
  })
  .superRefine((d, ctx) => {
    if (!d.rows.some((r) => r.selected)) {
      ctx.addIssue({
        code: "custom",
        message: "Pick at least one player to start.",
        path: ["rows"],
      });
    }
  });

export type StartGameFormValues = z.infer<typeof startGameFormSchema>;

export const startGamePayloadSchema = z.object({
  ...detailPayloadFields,
  participants: z.array(z.object({ playerId })).min(1),
});

export type StartGamePayload = z.infer<typeof startGamePayloadSchema>;

// ---------------------------------------------------------------------------
// FINISH — record final roster + outcomes (>= 3 players, exactly one durak)
// ---------------------------------------------------------------------------

const finishRowSchema = z.object({
  playerId: z.string(),
  displayName: z.string(),
  selected: z.boolean(),
  outcome: z.enum(OUTCOMES),
});

export const finishGameFormSchema = z
  .object({ ...detailFormFields, rows: z.array(finishRowSchema) })
  .refine(deckCountFormCheck, {
    message: "Deck count must be a positive whole number.",
    path: ["deckCount"],
  })
  .superRefine((d, ctx) => {
    const selected = d.rows.filter((r) => r.selected);
    const err = outcomeCountError(tally(selected.map((r) => r.outcome)));
    if (err) ctx.addIssue({ code: "custom", message: err, path: ["rows"] });
  });

export type FinishGameFormValues = z.infer<typeof finishGameFormSchema>;

const participantSchema = z.object({
  playerId,
  isDurak: z.boolean(),
  isFirstOut: z.boolean(),
  isLastOut: z.boolean(),
});

export const finishGamePayloadSchema = z
  .object({
    ...detailPayloadFields,
    participants: z.array(participantSchema),
  })
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

export type FinishGamePayload = z.infer<typeof finishGamePayloadSchema>;

// ---------------------------------------------------------------------------
// Form -> payload helpers
// ---------------------------------------------------------------------------

export function startRowsToParticipants(
  rows: StartGameFormValues["rows"],
): StartGamePayload["participants"] {
  return rows.filter((r) => r.selected).map((r) => ({ playerId: r.playerId }));
}

export function finishRowsToParticipants(
  rows: FinishGameFormValues["rows"],
): FinishGamePayload["participants"] {
  return rows
    .filter((r) => r.selected)
    .map((r) => ({
      playerId: r.playerId,
      isDurak: r.outcome === "durak",
      isFirstOut: r.outcome === "first_out",
      isLastOut: r.outcome === "last_out",
    }));
}
