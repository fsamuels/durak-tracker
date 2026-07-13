import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { NavMenu } from "./nav-menu";

// next/link renders a plain anchor in jsdom.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
}

describe("NavMenu", () => {
  it("is collapsed until the toggle is clicked", () => {
    render(<NavMenu />);
    expect(
      screen.queryByRole("link", { name: "Manage group" }),
    ).not.toBeInTheDocument();
  });

  it("links to Manage group but not a separate Switch group entry", () => {
    render(<NavMenu />);
    openMenu();

    expect(screen.getByRole("link", { name: "Manage group" })).toHaveAttribute(
      "href",
      "/group",
    );
    expect(
      screen.queryByRole("link", { name: "Switch group" }),
    ).not.toBeInTheDocument();
  });

  it("still exposes the other menu destinations", () => {
    render(<NavMenu />);
    openMenu();

    expect(
      screen.getByRole("link", { name: "Start a game" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("hides the My stats link when there is no player id", () => {
    render(<NavMenu />);
    openMenu();

    expect(
      screen.queryByRole("link", { name: "My stats" }),
    ).not.toBeInTheDocument();
  });

  it("links My stats to the player's stats page when a player id is given", () => {
    render(<NavMenu myPlayerId="a0000000-0000-0000-0000-000000000001" />);
    openMenu();

    expect(screen.getByRole("link", { name: "My stats" })).toHaveAttribute(
      "href",
      "/stats/players/a0000000-0000-0000-0000-000000000001",
    );
  });

  it("hides the Admin link by default", () => {
    render(<NavMenu />);
    openMenu();

    expect(
      screen.queryByRole("link", { name: "Admin" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Admin link for admins", () => {
    render(<NavMenu isAdmin />);
    openMenu();

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("hides Install app until the browser offers a beforeinstallprompt event", () => {
    render(<NavMenu />);
    openMenu();

    expect(
      screen.queryByRole("button", { name: "Install app" }),
    ).not.toBeInTheDocument();
  });

  it("shows Install app and triggers the native prompt once captured", async () => {
    render(<NavMenu />);
    openMenu();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    fireEvent(window, event);

    const installButton = await screen.findByRole("button", {
      name: "Install app",
    });
    fireEvent.click(installButton);

    expect(prompt).toHaveBeenCalledOnce();
    // Clicking a menu item also closes the menu.
    expect(
      screen.queryByRole("link", { name: "Manage group" }),
    ).not.toBeInTheDocument();
  });
});
