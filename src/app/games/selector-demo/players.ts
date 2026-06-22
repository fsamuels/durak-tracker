/**
 * Placeholder roster for the player-selection demo. Ranked by games-played desc,
 * mirroring getGroupRoster, so the "Regulars" variant has a meaningful top slice
 * and a long tail to exercise search. Demo-only — no DB calls.
 */

export type DemoPlayer = {
  id: string;
  display_name: string;
  /** Only used to rank the roster; not shown in the UI. */
  games_played: number;
};

const NAMES: [string, number][] = [
  // A dozen "regulars" with high game counts.
  ["Forrest Samuels", 142],
  ["Nadia Petrova", 138],
  ["Dmitri Volkov", 131],
  ["Lena Aronova", 120],
  ["Marcus Hale", 117],
  ["Yuki Tanaka", 109],
  ["Priya Nair", 98],
  ["Sofia Reyes", 91],
  ["Tomas Becker", 84],
  ["Olga Sidorova", 79],
  ["Andre Costa", 71],
  ["Hannah Klein", 64],
  // The long tail — occasional players and guests.
  ["Beatriz Lima", 38],
  ["Chen Wei", 34],
  ["Diego Martin", 29],
  ["Elena Popova", 27],
  ["Farid Hassan", 24],
  ["Greta Olsen", 21],
  ["Ivan Kozlov", 19],
  ["Jamal Carter", 17],
  ["Kira Yusupova", 15],
  ["Liam O'Brien", 13],
  ["Mei Lin", 12],
  ["Noah Fischer", 10],
  ["Oksana Bondar", 9],
  ["Pavel Novak", 8],
  ["Quinn Adams", 7],
  ["Rosa Mendez", 6],
  ["Sven Eriksson", 5],
  ["Tariq Aziz", 4],
  ["Ursula Wagner", 3],
  ["Viktor Ilyin", 2],
  ["Wendy Zhao", 2],
  ["Xavier Dubois", 1],
  ["Zara Ahmed", 1],
];

export const DEMO_PLAYERS: DemoPlayer[] = NAMES.map(([name, games], i) => ({
  id: `demo-${i}`,
  display_name: name,
  games_played: games,
})).sort((a, b) => b.games_played - a.games_played);

/** How many top-ranked players the "Regulars" variant surfaces up front. */
export const REGULARS_COUNT = 12;
