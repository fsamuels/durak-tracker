import { describe, it, expect } from "vitest";

import {
  rate,
  formatDuration,
  groupStatsSchema,
  playerStatsSchema,
} from "./stats";

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
  };

  it("parses a well-formed payload", () => {
    expect(groupStatsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null nullable fields", () => {
    expect(
      groupStatsSchema.safeParse({
        ...valid,
        avg_duration_seconds: null,
        player_game_count: null,
        last_durak: null,
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
  it("parses integer streak fields", () => {
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
      }).success,
    ).toBe(false);
  });
});
