import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { OutcomeToggle } from "./outcome-toggle";

describe("OutcomeToggle", () => {
  it("offers exactly the three roles, labeled by player", () => {
    render(<OutcomeToggle name="Alex" value="none" onSelect={() => {}} />);
    const group = screen.getByRole("group", { name: "Alex outcome" });
    const buttons = Array.from(group.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Durak 🃏",
      "1st out",
      "Last out",
    ]);
    for (const b of buttons) expect(b).toHaveAttribute("aria-pressed", "false");
  });

  it("marks the current role pressed in that outcome's badge tone", () => {
    render(<OutcomeToggle name="Alex" value="durak" onSelect={() => {}} />);
    const durak = screen.getByRole("button", { name: "Durak 🃏" });
    expect(durak).toHaveAttribute("aria-pressed", "true");
    expect(durak).toHaveClass("badge-durak");
    expect(screen.getByRole("button", { name: "1st out" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the tapped role, including the active one", () => {
    const onSelect = vi.fn();
    render(<OutcomeToggle name="Alex" value="durak" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Last out" }));
    fireEvent.click(screen.getByRole("button", { name: "Durak 🃏" }));
    expect(onSelect.mock.calls).toEqual([["last_out"], ["durak"]]);
  });

  it("never submits the surrounding form", () => {
    render(<OutcomeToggle name="Alex" value="none" onSelect={() => {}} />);
    for (const b of screen.getAllByRole("button"))
      expect(b).toHaveAttribute("type", "button");
  });
});
