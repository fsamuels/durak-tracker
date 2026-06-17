import { describe, it, expect } from "vitest";

import {
  outcomeCountError,
  startGameFormSchema,
  startGamePayloadSchema,
  finishGameFormSchema,
  finishGamePayloadSchema,
  startRowsToParticipants,
  finishRowsToParticipants,
} from "./game";

const GUID_A = "a0000000-0000-0000-0000-000000000001";
const GUID_B = "a0000000-0000-0000-0000-000000000002";
const GUID_C = "a0000000-0000-0000-0000-000000000003";

describe("outcomeCountError", () => {
  it("accepts a valid 3-player game with one durak", () => {
    expect(
      outcomeCountError({ total: 3, durak: 1, firstOut: 1, lastOut: 1 }),
    ).toBeNull();
  });

  it("rejects fewer than 3 players", () => {
    expect(
      outcomeCountError({ total: 2, durak: 1, firstOut: 0, lastOut: 0 }),
    ).toMatch(/at least 3/);
  });

  it("rejects zero duraks", () => {
    expect(
      outcomeCountError({ total: 4, durak: 0, firstOut: 0, lastOut: 0 }),
    ).toMatch(/exactly one|one player must be the durak/i);
  });

  it("rejects more than one durak", () => {
    expect(
      outcomeCountError({ total: 4, durak: 2, firstOut: 0, lastOut: 0 }),
    ).toMatch(/durak/i);
  });

  it("rejects more than one first-out", () => {
    expect(
      outcomeCountError({ total: 4, durak: 1, firstOut: 2, lastOut: 0 }),
    ).toMatch(/first out/i);
  });

  it("rejects more than one last-out", () => {
    expect(
      outcomeCountError({ total: 4, durak: 1, firstOut: 0, lastOut: 2 }),
    ).toMatch(/last out/i);
  });
});

describe("startGameFormSchema", () => {
  const base = { trumpSuit: "", deckCount: "", notes: "" };

  it("requires at least one selected player", () => {
    const r = startGameFormSchema.safeParse({
      ...base,
      rows: [{ playerId: GUID_A, displayName: "Ann", selected: false }],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path.includes("rows"))).toBe(true);
  });

  it("accepts one selected player and an empty deck count", () => {
    const r = startGameFormSchema.safeParse({
      ...base,
      rows: [{ playerId: GUID_A, displayName: "Ann", selected: true }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-numeric deck count", () => {
    const r = startGameFormSchema.safeParse({
      ...base,
      deckCount: "two",
      rows: [{ playerId: GUID_A, displayName: "Ann", selected: true }],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path.includes("deckCount"))).toBe(
      true,
    );
  });

  it("rejects a zero deck count", () => {
    const r = startGameFormSchema.safeParse({
      ...base,
      deckCount: "0",
      rows: [{ playerId: GUID_A, displayName: "Ann", selected: true }],
    });
    expect(r.success).toBe(false);
  });
});

describe("startGamePayloadSchema", () => {
  it("requires at least one participant", () => {
    expect(
      startGamePayloadSchema.safeParse({
        trumpSuit: null,
        deckCount: null,
        notes: null,
        participants: [],
      }).success,
    ).toBe(false);
  });

  it("accepts a valid trump suit and positive deck count", () => {
    expect(
      startGamePayloadSchema.safeParse({
        trumpSuit: "hearts",
        deckCount: 1,
        notes: null,
        participants: [{ playerId: GUID_A }],
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown trump suit", () => {
    expect(
      startGamePayloadSchema.safeParse({
        trumpSuit: "wands",
        deckCount: null,
        notes: null,
        participants: [{ playerId: GUID_A }],
      }).success,
    ).toBe(false);
  });
});

describe("finishGameFormSchema", () => {
  const base = { trumpSuit: "", deckCount: "", notes: "" };
  const row = (
    playerId: string,
    outcome: "none" | "durak" | "first_out" | "last_out",
  ) => ({ playerId, displayName: playerId, selected: true, outcome });

  it("accepts three selected players with exactly one durak", () => {
    const r = finishGameFormSchema.safeParse({
      ...base,
      rows: [
        row(GUID_A, "durak"),
        row(GUID_B, "first_out"),
        row(GUID_C, "last_out"),
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects two selected players (needs at least 3)", () => {
    const r = finishGameFormSchema.safeParse({
      ...base,
      rows: [row(GUID_A, "durak"), row(GUID_B, "none")],
    });
    expect(r.success).toBe(false);
  });

  it("ignores unselected rows when tallying outcomes", () => {
    const r = finishGameFormSchema.safeParse({
      ...base,
      rows: [
        row(GUID_A, "durak"),
        row(GUID_B, "none"),
        row(GUID_C, "none"),
        {
          ...row("a0000000-0000-0000-0000-000000000004", "durak"),
          selected: false,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("row -> participant helpers", () => {
  it("startRowsToParticipants keeps only selected rows", () => {
    const result = startRowsToParticipants([
      { playerId: GUID_A, displayName: "Ann", selected: true },
      { playerId: GUID_B, displayName: "Bob", selected: false },
    ]);
    expect(result).toEqual([{ playerId: GUID_A }]);
  });

  it("finishRowsToParticipants maps outcomes to boolean flags", () => {
    const result = finishRowsToParticipants([
      {
        playerId: GUID_A,
        displayName: "Ann",
        selected: true,
        outcome: "durak",
      },
      {
        playerId: GUID_B,
        displayName: "Bob",
        selected: true,
        outcome: "first_out",
      },
      {
        playerId: GUID_C,
        displayName: "Cy",
        selected: false,
        outcome: "last_out",
      },
    ]);
    expect(result).toEqual([
      { playerId: GUID_A, isDurak: true, isFirstOut: false, isLastOut: false },
      { playerId: GUID_B, isDurak: false, isFirstOut: true, isLastOut: false },
    ]);
  });
});

describe("finishGamePayloadSchema", () => {
  const p = (
    playerId: string,
    flags: Partial<{
      isDurak: boolean;
      isFirstOut: boolean;
      isLastOut: boolean;
    }>,
  ) => ({
    playerId,
    isDurak: false,
    isFirstOut: false,
    isLastOut: false,
    ...flags,
  });

  it("accepts a valid completed game", () => {
    expect(
      finishGamePayloadSchema.safeParse({
        trumpSuit: null,
        deckCount: null,
        notes: null,
        participants: [
          p(GUID_A, { isDurak: true }),
          p(GUID_B, { isFirstOut: true }),
          p(GUID_C, { isLastOut: true }),
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a completed game with no durak", () => {
    expect(
      finishGamePayloadSchema.safeParse({
        trumpSuit: null,
        deckCount: null,
        notes: null,
        participants: [p(GUID_A, {}), p(GUID_B, {}), p(GUID_C, {})],
      }).success,
    ).toBe(false);
  });
});
