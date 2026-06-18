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
});
