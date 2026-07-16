import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PlayerChipGrid, type ChipGridPlayer } from "./player-chip-grid";

const players: ChipGridPlayer[] = [
  { id: "1", display_name: "Alex" },
  { id: "2", display_name: "Blair" },
  { id: "3", display_name: "Casey" },
];

function chipButtons() {
  // The chips are the toggle buttons (they carry aria-pressed); the search box
  // is a textbox, so filtering by aria-pressed isolates the chips.
  return screen
    .queryAllByRole("button")
    .filter((b) => b.hasAttribute("aria-pressed"));
}

describe("PlayerChipGrid", () => {
  it("renders a chip per player", () => {
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    );
    expect(chipButtons()).toHaveLength(3);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Blair")).toBeInTheDocument();
    expect(screen.getByText("Casey")).toBeInTheDocument();
  });

  it("marks selected chips with aria-pressed", () => {
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set(["2"])}
        onToggle={() => {}}
      />,
    );
    const blair = screen.getByRole("button", { name: /Blair/ });
    expect(blair).toHaveAttribute("aria-pressed", "true");
    const alex = screen.getByRole("button", { name: /Alex/ });
    expect(alex).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggle with the right id when a chip is tapped", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set()}
        onToggle={onToggle}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Casey/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("3");
  });

  it("filters chips by the search input", async () => {
    const user = userEvent.setup();
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "bl");
    const chips = chipButtons();
    expect(chips).toHaveLength(1);
    expect(within(chips[0]).getByText("Blair")).toBeInTheDocument();
  });

  it("sorts selected chips first", () => {
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set(["3"])}
        onToggle={() => {}}
      />,
    );
    const chips = chipButtons();
    // Casey is selected, so it floats to the front even though it's last in the
    // given order.
    expect(within(chips[0]).getByText("Casey")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches the search", async () => {
    const user = userEvent.setup();
    render(
      <PlayerChipGrid
        players={players}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(chipButtons()).toHaveLength(0);
    expect(screen.getByText(/No players match/)).toBeInTheDocument();
  });
});
