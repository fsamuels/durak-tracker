import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { AdminGroupOption } from "@/lib/data/admin-groups";

// The action module is server-only (next/cache, supabase server client) —
// the form's client behavior is what's under test here.
vi.mock("./actions", () => ({ addUserToGroupAction: vi.fn() }));

import { AddToGroupForm } from "./add-to-group-form";

const groups: AdminGroupOption[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Friday Durak",
    guests: [
      { id: "aaaaaaaa-1111-1111-1111-111111111111", displayName: "Guest Gary" },
    ],
    linkedUserIds: [],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Family",
    guests: [],
    linkedUserIds: ["user-1"],
  },
];

function renderForm() {
  render(
    <AddToGroupForm userId="user-1" defaultName="Forrest" groups={groups} />,
  );
}

describe("AddToGroupForm", () => {
  it("disables groups the account already has a player in", () => {
    renderForm();
    expect(
      screen.getByRole("option", { name: /Family — already added/ }),
    ).toBeDisabled();
    expect(screen.getByRole("option", { name: "Friday Durak" })).toBeEnabled();
  });

  it("keeps the player picker and submit disabled until a group is chosen", () => {
    renderForm();
    expect(screen.getByLabelText("Player")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to group" })).toBeDisabled();
  });

  it("offers the chosen group's guests and enables submit", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group"), {
      target: { value: groups[0].id },
    });
    expect(
      screen.getByRole("option", { name: "Link guest: Guest Gary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to group" })).toBeEnabled();
  });

  it("prefills the name for a new player and hides it when linking a guest", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group"), {
      target: { value: groups[0].id },
    });
    expect(screen.getByLabelText("Display name")).toHaveValue("Forrest");

    fireEvent.change(screen.getByLabelText("Player"), {
      target: { value: groups[0].guests[0].id },
    });
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
  });

  it("resets the guest selection when the group changes", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Group"), {
      target: { value: groups[0].id },
    });
    fireEvent.change(screen.getByLabelText("Player"), {
      target: { value: groups[0].guests[0].id },
    });
    fireEvent.change(screen.getByLabelText("Group"), {
      target: { value: groups[1].id },
    });
    expect(screen.getByLabelText("Player")).toHaveValue("");
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
  });
});
