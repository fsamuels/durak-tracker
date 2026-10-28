import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { FinishGameForm } from "./finish-game-form";

const finishGameAction = vi.fn();

vi.mock("./actions", () => ({
  finishGameAction: (...args: unknown[]) => finishGameAction(...args),
  updateGameAction: vi.fn(),
  discardGameAction: vi.fn(),
}));

vi.mock("@/app/players/actions", () => ({ addPlayerAction: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const A = "a0000000-0000-0000-0000-000000000001";
const B = "a0000000-0000-0000-0000-000000000002";
const C = "a0000000-0000-0000-0000-000000000003";

const players = [
  { id: A, display_name: "Alex" },
  { id: B, display_name: "Sam" },
  { id: C, display_name: "Kim" },
];

function renderForm() {
  return render(
    <FinishGameForm
      gameId="g0000000-0000-0000-0000-000000000001"
      players={players}
      startedPlayerIds={[A, B, C]}
      initialOutcomes={{}}
      initialTrumpSuit=""
      initialDeckCount=""
      initialNotes=""
    />,
  );
}

function roleButton(player: string, role: string) {
  const group = screen.getByRole("group", { name: `${player} outcome` });
  return Array.from(group.querySelectorAll("button")).find(
    (b) => b.textContent === role,
  )!;
}

describe("FinishGameForm one-tap outcomes", () => {
  beforeEach(() => finishGameAction.mockReset());

  it("moves the durak to the newly tapped player", () => {
    renderForm();
    fireEvent.click(roleButton("Alex", "Durak 🃏"));
    expect(roleButton("Alex", "Durak 🃏")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(roleButton("Sam", "Durak 🃏"));
    expect(roleButton("Sam", "Durak 🃏")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(roleButton("Alex", "Durak 🃏")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clears a role when it is tapped again", () => {
    renderForm();
    fireEvent.click(roleButton("Kim", "1st out"));
    fireEvent.click(roleButton("Kim", "1st out"));
    expect(roleButton("Kim", "1st out")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("enables Finish once there is a durak, and submits the outcomes", async () => {
    finishGameAction.mockResolvedValue({});
    renderForm();
    const finish = screen.getByRole("button", { name: "Finish game" });
    expect(finish).toBeDisabled();

    fireEvent.click(roleButton("Alex", "Durak 🃏"));
    fireEvent.click(roleButton("Sam", "1st out"));
    expect(finish).toBeEnabled();

    fireEvent.click(finish);
    await waitFor(() => expect(finishGameAction).toHaveBeenCalledTimes(1));
    const [, payload] = finishGameAction.mock.calls[0];
    expect(payload.participants).toEqual([
      { playerId: A, isDurak: true, isFirstOut: false, isLastOut: false },
      { playerId: B, isDurak: false, isFirstOut: true, isLastOut: false },
      { playerId: C, isDurak: false, isFirstOut: false, isLastOut: false },
    ]);
  });
});
