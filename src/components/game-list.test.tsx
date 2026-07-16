import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { GameList } from "./game-list";
import type { GameHistoryGame } from "@/lib/data/games";

// The history type is inferred from a Supabase query; construct just the shape
// GameList reads and cast, mirroring how the real rows arrive.
function makeGame(overrides: Partial<GameHistoryGame> = {}): GameHistoryGame {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    started_at: "2026-06-17T18:00:00.000Z",
    ended_at: "2026-06-17T19:00:00.000Z",
    trump_suit: "hearts",
    deck_count: 1,
    logged_by: "u1",
    logged_by_name: "Alex",
    game_players: [
      { is_durak: true, players: { display_name: "Blair" } },
      { is_durak: false, players: { display_name: "Casey" } },
    ],
    ...overrides,
  } as unknown as GameHistoryGame;
}

describe("GameList", () => {
  it("renders a prominent full-width Play again button linking to start-again", () => {
    render(
      <GameList
        games={[makeGame()]}
        timezone="America/New_York"
        emptyState={<li>none</li>}
      />,
    );
    const link = screen.getByRole("link", { name: /Play again/ });
    expect(link).toHaveAttribute(
      "href",
      "/games/new?from=11111111-1111-1111-1111-111111111111",
    );
    // The brand-pill styling that matches "Start a game" / the detail page CTA.
    expect(link).toHaveClass("btn-brand");
    expect(link).toHaveClass("h-12");
    expect(link).toHaveClass("rounded-full");
    expect(link).toHaveClass("font-semibold");
  });

  it("keeps the duration visible in the meta line", () => {
    render(
      <GameList
        games={[makeGame()]}
        timezone="America/New_York"
        emptyState={<li>none</li>}
      />,
    );
    // 18:00 → 19:00 is one hour; formatDuration renders it with the clock glyph.
    expect(screen.getByText(/⏱/)).toBeInTheDocument();
  });

  it("renders the empty state when there are no games", () => {
    render(
      <GameList
        games={[]}
        timezone="America/New_York"
        emptyState={<li>No games logged yet.</li>}
      />,
    );
    expect(screen.getByText("No games logged yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Play again/ }),
    ).not.toBeInTheDocument();
  });
});
