import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { GroupDetails } from "./group-details";
import type { GroupDetails as GroupDetailsData } from "@/lib/data/groups";

const base: GroupDetailsData = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "Run Club",
  timezone: "America/New_York",
  createdAt: "2026-06-17T16:00:00.000Z",
  ownerName: "Alex",
  viewerIsOwner: false,
  memberCount: 3,
  playerCount: 5,
  gameCount: 12,
};

function valueFor(label: string) {
  // Each fact is a <dt> label paired with the following <dd> value.
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("GroupDetails", () => {
  it("shows the group name and core facts", () => {
    render(<GroupDetails details={base} />);
    expect(
      screen.getByRole("heading", { name: "Run Club" }),
    ).toBeInTheDocument();
    expect(within(valueFor("Owner")).getByText("Alex")).toBeInTheDocument();
    expect(
      within(valueFor("Timezone")).getByText("America/New_York"),
    ).toBeInTheDocument();
    expect(
      within(valueFor("Created")).getByText("Jun 17, 2026"),
    ).toBeInTheDocument();
  });

  it("renders pluralized counts", () => {
    render(<GroupDetails details={base} />);
    expect(
      within(valueFor("Members")).getByText("3 members"),
    ).toBeInTheDocument();
    expect(
      within(valueFor("Players")).getByText("5 players"),
    ).toBeInTheDocument();
    expect(within(valueFor("Games")).getByText("12 games")).toBeInTheDocument();
  });

  it("uses singular nouns for counts of one", () => {
    render(
      <GroupDetails
        details={{ ...base, memberCount: 1, playerCount: 1, gameCount: 1 }}
      />,
    );
    expect(
      within(valueFor("Members")).getByText("1 member"),
    ).toBeInTheDocument();
    expect(
      within(valueFor("Players")).getByText("1 player"),
    ).toBeInTheDocument();
    expect(within(valueFor("Games")).getByText("1 game")).toBeInTheDocument();
  });

  it("flags the viewer as owner and shows their name", () => {
    render(
      <GroupDetails
        details={{ ...base, viewerIsOwner: true, ownerName: "Sam" }}
      />,
    );
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(
      within(valueFor("Owner")).getByText("You (Sam)"),
    ).toBeInTheDocument();
  });

  it("falls back to Unknown when the owner name is missing", () => {
    render(<GroupDetails details={{ ...base, ownerName: null }} />);
    expect(within(valueFor("Owner")).getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("owner")).not.toBeInTheDocument();
  });
});
