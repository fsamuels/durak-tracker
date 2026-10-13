import { describe, expect, it } from "vitest";

import { aboutFacts, formatPlayTime, topTrump } from "./about-facts";
import type { CodebaseStats } from "./build-info";
import type { AppStats } from "./data/app-stats";

const stats: AppStats = {
  groups: 2,
  accounts: 5,
  players: 9,
  guestPlayers: 3,
  games: 40,
  seats: 160,
  playedSeconds: 40 * 25 * 60,
  trumpGames: { hearts: 5, diamonds: 15, clubs: 10, spades: 0 },
  largestTable: 6,
  firstGameAt: "2026-01-01T00:00:00.000Z",
};

const code: CodebaseStats = {
  languages: [],
  totalFiles: 10,
  totalLines: 5000,
  routes: 3,
  components: 4,
  serverActions: 2,
  migrations: 20,
  sqlFunctions: 25,
  testFiles: 5,
  testCases: 50,
  docsWords: 23000,
  longestFile: { path: "src/app/page.tsx", lines: 400 },
};

describe("formatPlayTime", () => {
  it("shows minutes under an hour and hours past a day", () => {
    expect(formatPlayTime(25 * 60)).toBe("25m");
    expect(formatPlayTime(30 * 3600 + 5 * 60)).toBe("30h 05m");
  });
});

describe("topTrump", () => {
  it("picks the most-called suit and its share of suited games", () => {
    expect(topTrump(stats.trumpGames)).toEqual({
      suit: "diamonds",
      games: 15,
      share: 50,
    });
  });

  it("returns null when no game recorded a suit", () => {
    expect(
      topTrump({ hearts: 0, diamonds: 0, clubs: 0, spades: 0 }),
    ).toBeNull();
  });
});

describe("aboutFacts", () => {
  it("derives game and codebase facts", () => {
    const facts = aboutFacts(
      stats,
      code,
      new Date("2026-01-11T00:00:00.000Z").getTime(),
    );
    expect(facts).toContain(
      "The average table seats 4.0 players; the biggest game had 6.",
    );
    expect(facts).toContain("The average game runs 25m.");
    expect(facts).toContain(
      "Diamonds is the most common trump, called in 50% of games with a recorded suit.",
    );
    expect(facts).toContain(
      "The first game was played 10 days ago — about 4.0 games a day since.",
    );
    expect(facts).toContain(
      "Printed out, the source code would fill roughly 100 pages.",
    );
    expect(facts).toContain(
      "The docs run 23,000 words — about 100 minutes of reading.",
    );
  });

  it("skips game facts without stats or games", () => {
    expect(aboutFacts(null, null)).toEqual([]);
    expect(aboutFacts({ ...stats, games: 0 }, null)).toEqual([]);
  });
});
