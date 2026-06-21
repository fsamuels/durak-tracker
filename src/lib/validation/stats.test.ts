import { describe, it, expect } from "vitest";

import {
  rate,
  formatDuration,
  groupStatsSchema,
  headToHeadSchema,
  parseWindow,
  playerStatsSchema,
  topTrumpSuit,
  type GroupStats,
} from "./stats";

function makeStats(overrides: Partial<GroupStats> = {}): GroupStats {
  return {
    games_played: 0,
    games_with_duration: 0,
    avg_duration_seconds: null,
    longest_game_seconds: null,
    shortest_game_seconds: null,
    trump_frequency: [],
    players: [],
    player_game_count: null,
    last_durak: null,
    biggest_rivalry: null,
    ...overrides,
  };
}

describe("topTrumpSuit", () => {
  it("returns null for null stats", () => {
    expect(topTrumpSuit(null)).toBeNull();
  });

  it("returns null when no trump suit has been recorded", () => {
    expect(topTrumpSuit(makeStats({ trump_frequency: [] }))).toBeNull();
  });

  it("returns the suit with the highest count", () => {
    const stats = makeStats({
      trump_frequency: [
        { suit: "spades", count: 5 },
        { suit: "hearts", count: 9 },
        { suit: "clubs", count: 2 },
      ],
    });
    expect(topTrumpSuit(stats)).toEqual({ suit: "hearts", count: 9 });
  });

  it("does not rely on the array already being sorted by count", () => {
    const stats = makeStats({
      trump_frequency: [
        { suit: "clubs", count: 1 },
        { suit: "diamonds", count: 7 },
        { suit: "spades", count: 3 },
      ],
    });
    expect(topTrumpSuit(stats)).toEqual({ suit: "diamonds", count: 7 });
  });

  it("keeps the first suit on a tie", () => {
    const stats = makeStats({
      trump_frequency: [
        { suit: "hearts", count: 4 },
        { suit: "spades", count: 4 },
      ],
    });
    expect(topTrumpSuit(stats)).toEqual({ suit: "hearts", count: 4 });
  });
});

describe("rate", () => {
  it("returns an em dash for zero total", () => {
    expect(rate(0, 0)).toBe("—");
  });

  it("rounds to a whole percent", () => {
    expect(rate(1, 3)).toBe("33%");
    expect(rate(2, 3)).toBe("67%");
  });

  it("handles 100%", () => {
    expect(rate(5, 5)).toBe("100%");
  });
});

describe("formatDuration", () => {
  it("returns an em dash for null", () => {
    expect(formatDuration(null)).toBe("—");
  });

  it("renders sub-hour durations in minutes", () => {
    expect(formatDuration(42 * 60)).toBe("42m");
  });

  it("rounds seconds to the nearest minute", () => {
    expect(formatDuration(90)).toBe("2m"); // 1.5 min rounds to 2
  });

  it("renders hours with zero-padded minutes", () => {
    expect(formatDuration(3900)).toBe("1h 05m"); // 65 min
  });

  it("renders a whole number of hours", () => {
    expect(formatDuration(7200)).toBe("2h 00m");
  });
});

describe("groupStatsSchema", () => {
  const valid = {
    games_played: 10,
    games_with_duration: 8,
    avg_duration_seconds: 1800,
    longest_game_seconds: 3000,
    shortest_game_seconds: 600,
    trump_frequency: [{ suit: "hearts", count: 3 }],
    players: [
      {
        player_id: "a0000000-0000-0000-0000-000000000001",
        display_name: "Ann",
        games_played: 10,
        durak_count: 2,
        first_out_count: 3,
        last_out_count: 1,
      },
    ],
    player_game_count: { min: 5, max: 10, avg: 7.5 },
    last_durak: {
      player_id: "a0000000-0000-0000-0000-000000000001",
      display_name: "Ann",
      started_at: "2026-06-17T04:00:00.000Z",
    },
    biggest_rivalry: {
      player_a_id: "a0000000-0000-0000-0000-000000000001",
      player_a_name: "Ann",
      player_a_durak_count: 2,
      player_b_id: "a0000000-0000-0000-0000-000000000002",
      player_b_name: "Bob",
      player_b_durak_count: 3,
      games_together: 8,
    },
  };

  it("parses a well-formed payload", () => {
    expect(groupStatsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null nullable fields", () => {
    expect(
      groupStatsSchema.safeParse({
        ...valid,
        avg_duration_seconds: null,
        longest_game_seconds: null,
        shortest_game_seconds: null,
        player_game_count: null,
        last_durak: null,
        biggest_rivalry: null,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown trump suit", () => {
    expect(
      groupStatsSchema.safeParse({
        ...valid,
        trump_frequency: [{ suit: "wands", count: 1 }],
      }).success,
    ).toBe(false);
  });
});

describe("playerStatsSchema", () => {
  it("parses integer streak fields and recent form", () => {
    expect(
      playerStatsSchema.safeParse({
        games_played: 10,
        durak_count: 2,
        first_out_count: 3,
        last_out_count: 1,
        current_durak_streak: 0,
        longest_durak_streak: 2,
        current_win_streak: 1,
        longest_win_streak: 4,
        recent_form: [
          { result: "durak", started_at: "2026-06-17T04:00:00.000Z" },
          { result: "middle", started_at: "2026-06-16T04:00:00.000Z" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects a non-integer count", () => {
    expect(
      playerStatsSchema.safeParse({
        games_played: 1.5,
        durak_count: 0,
        first_out_count: 0,
        last_out_count: 0,
        current_durak_streak: 0,
        longest_durak_streak: 0,
        current_win_streak: 0,
        longest_win_streak: 0,
        recent_form: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown recent-form result", () => {
    expect(
      playerStatsSchema.safeParse({
        games_played: 1,
        durak_count: 0,
        first_out_count: 0,
        last_out_count: 0,
        current_durak_streak: 0,
        longest_durak_streak: 0,
        current_win_streak: 0,
        longest_win_streak: 0,
        recent_form: [{ result: "winner", started_at: "2026-06-17T04:00:00Z" }],
      }).success,
    ).toBe(false);
  });
});

describe("headToHeadSchema", () => {
  it("parses a list of opponent lines", () => {
    expect(
      headToHeadSchema.safeParse([
        {
          opponent_id: "a0000000-0000-0000-0000-000000000002",
          display_name: "Bob",
          games_together: 8,
          my_durak_count: 3,
          opponent_durak_count: 2,
        },
      ]).success,
    ).toBe(true);
  });

  it("accepts an empty list", () => {
    expect(headToHeadSchema.safeParse([]).success).toBe(true);
  });
});

describe("parseWindow", () => {
  it("passes through valid windows", () => {
    expect(parseWindow("week")).toBe("week");
    expect(parseWindow("year")).toBe("year");
  });

  it("defaults unknown or missing values to all", () => {
    expect(parseWindow(undefined)).toBe("all");
    expect(parseWindow("decade")).toBe("all");
  });

  it("takes the first value of an array param", () => {
    expect(parseWindow(["month", "week"])).toBe("month");
  });
});
