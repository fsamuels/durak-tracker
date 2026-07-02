import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { AdminPlayerClaim } from "@/lib/data/claims";

import { ClaimsSection, claimStatusCounts } from "./claims-section";

const DAY = 86_400_000;

const claims: AdminPlayerClaim[] = [
  {
    id: "1",
    status: "valid",
    groupName: "Group One",
    playerName: "Valid Vic",
    createdByEmail: "minter@example.com",
    createdAt: "2026-06-30T12:00:00.000Z",
    expiresAt: new Date(Date.now() + 3 * DAY).toISOString(),
    claimedByEmail: null,
    claimedAt: null,
  },
  {
    id: "2",
    status: "expired",
    groupName: "Group Two",
    playerName: "Expired Ed",
    createdByEmail: null,
    createdAt: "2026-06-20T12:00:00.000Z",
    expiresAt: new Date(Date.now() - 2 * DAY).toISOString(),
    claimedByEmail: null,
    claimedAt: null,
  },
  {
    id: "3",
    status: "claimed",
    groupName: "Group Three",
    playerName: "Claimed Cara",
    createdByEmail: null,
    createdAt: "2026-06-10T12:00:00.000Z",
    expiresAt: "2026-06-17T12:00:00.000Z",
    claimedByEmail: "claimer@example.com",
    claimedAt: "2026-06-12T12:00:00.000Z",
  },
];

function openSection() {
  fireEvent.click(screen.getByRole("button", { name: /Claim links/ }));
}

describe("claimStatusCounts", () => {
  it("counts each status, zero-filling missing ones", () => {
    expect(claimStatusCounts(claims)).toEqual({
      valid: 1,
      expired: 1,
      claimed: 1,
    });
    expect(claimStatusCounts([])).toEqual({ valid: 0, expired: 0, claimed: 0 });
  });
});

describe("ClaimsSection", () => {
  it("keeps the header visible but collapses the list initially", () => {
    render(<ClaimsSection claims={claims} error={null} />);
    const toggle = screen.getByRole("button", { name: /Claim links/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // The filter chips live inside the collapsed panel (out of the a11y tree).
    expect(
      screen.queryByRole("button", { name: /expired/i }),
    ).not.toBeInTheDocument();
  });

  it("shows every claim once expanded", () => {
    render(<ClaimsSection claims={claims} error={null} />);
    openSection();
    expect(screen.getByText("Valid Vic")).toBeInTheDocument();
    expect(screen.getByText("Expired Ed")).toBeInTheDocument();
    expect(screen.getByText("Claimed Cara")).toBeInTheDocument();
  });

  it("filters the list to the selected status", () => {
    render(<ClaimsSection claims={claims} error={null} />);
    openSection();

    fireEvent.click(screen.getByRole("button", { name: /1 expired/ }));
    expect(screen.getByText("Expired Ed")).toBeInTheDocument();
    expect(screen.queryByText("Valid Vic")).not.toBeInTheDocument();
    expect(screen.queryByText("Claimed Cara")).not.toBeInTheDocument();

    // Back to all restores the full list.
    fireEvent.click(screen.getByRole("button", { name: /All 3/ }));
    expect(screen.getByText("Valid Vic")).toBeInTheDocument();
    expect(screen.getByText("Claimed Cara")).toBeInTheDocument();
  });

  it("shows an empty message when a status has no links", () => {
    const onlyValid = [claims[0]];
    render(<ClaimsSection claims={onlyValid} error={null} />);
    openSection();

    fireEvent.click(screen.getByRole("button", { name: /0 claimed/ }));
    expect(screen.getByText("No claimed links.")).toBeInTheDocument();
  });

  it("surfaces load errors expanded by default", () => {
    render(<ClaimsSection claims={[]} error={"HTTP 500 — boom"} />);
    const toggle = screen.getByRole("button", { name: /Claim links/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Failed to load claim links")).toBeInTheDocument();
    expect(screen.getByText("HTTP 500 — boom")).toBeInTheDocument();
  });
});
