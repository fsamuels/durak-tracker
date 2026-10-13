import type { CodebaseStats } from "@/lib/build-info";
import type { AppStats } from "@/lib/data/app-stats";
import type { TrumpSuit } from "@/lib/validation/game";

const DAY_MS = 24 * 60 * 60 * 1000;

const number = new Intl.NumberFormat("en-US");
export const fmt = (n: number) => number.format(n);

/** Total play time as `12h 30m` / `45m` — hours keep growing past a day. */
export function formatPlayTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${fmt(h)}h ${String(mins % 60).padStart(2, "0")}m`;
}

/** The trump suit called most often, or null with no suited games. */
export function topTrump(
  trumps: AppStats["trumpGames"],
): { suit: TrumpSuit; games: number; share: number } | null {
  const entries = Object.entries(trumps) as [TrumpSuit, number][];
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return null;
  const [suit, games] = entries.reduce((best, e) =>
    e[1] > best[1] ? e : best,
  );
  return { suit, games, share: Math.round((games / total) * 100) };
}

/**
 * One-line trivia for the About page's "Fun facts" card: a few from the
 * app-wide stats (skipped when they're unavailable or empty), the rest from
 * the build-time codebase stats.
 */
export function aboutFacts(
  stats: AppStats | null,
  code: CodebaseStats | null,
  now: number = Date.now(),
): string[] {
  const facts: string[] = [];

  if (stats && stats.games > 0) {
    facts.push(
      `Every one of the ${fmt(stats.games)} games logged so far ended with exactly one durak.`,
    );
    facts.push(
      `The average table seats ${(stats.seats / stats.games).toFixed(1)} players; the biggest game had ${stats.largestTable}.`,
    );
    if (stats.playedSeconds > 0) {
      facts.push(
        `The average game runs ${formatPlayTime(stats.playedSeconds / stats.games)}.`,
      );
    }
    const trump = topTrump(stats.trumpGames);
    if (trump) {
      facts.push(
        `${trump.suit[0]!.toUpperCase()}${trump.suit.slice(1)} is the most common trump, called in ${trump.share}% of games with a recorded suit.`,
      );
    }
    if (stats.firstGameAt) {
      const days = Math.max(
        1,
        Math.ceil((now - new Date(stats.firstGameAt).getTime()) / DAY_MS),
      );
      facts.push(
        `The first game was played ${fmt(days)} days ago — about ${(
          stats.games / days
        ).toFixed(1)} games a day since.`,
      );
    }
  }

  if (code) {
    // ~50 lines to a printed page.
    facts.push(
      `Printed out, the source code would fill roughly ${fmt(
        Math.round(code.totalLines / 50),
      )} pages.`,
    );
    // ~230 words a minute for technical prose.
    facts.push(
      `The docs run ${fmt(code.docsWords)} words — about ${fmt(
        Math.round(code.docsWords / 230),
      )} minutes of reading.`,
    );
    if (code.longestFile) {
      facts.push(
        `The longest file is ${code.longestFile.path} at ${fmt(
          code.longestFile.lines,
        )} lines.`,
      );
    }
    if (code.sqlFunctions > 0 && code.migrations > 0) {
      facts.push(
        `${code.migrations} migrations define ${code.sqlFunctions} SQL functions — the database does the authorization and the math.`,
      );
    }
  }

  return facts;
}
