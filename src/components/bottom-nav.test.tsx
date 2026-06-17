import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { BottomNav } from "./bottom-nav";

// next/navigation's usePathname is the only runtime dependency; stub it per-test.
const usePathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

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

function linkFor(label: string) {
  return screen.getByRole("link", { name: new RegExp(label) });
}

describe("BottomNav", () => {
  beforeEach(() => usePathname.mockReset());

  it("renders all four tabs", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("marks Home active on the root path", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);
    expect(linkFor("Home")).toHaveAttribute("aria-current", "page");
    expect(linkFor("Games")).not.toHaveAttribute("aria-current");
  });

  it("matches Games on nested game routes", () => {
    usePathname.mockReturnValue("/games/123");
    render(<BottomNav />);
    expect(linkFor("Games")).toHaveAttribute("aria-current", "page");
    expect(linkFor("Home")).not.toHaveAttribute("aria-current");
  });

  it("does not mark Home active on a non-root path", () => {
    usePathname.mockReturnValue("/stats");
    render(<BottomNav />);
    expect(linkFor("Home")).not.toHaveAttribute("aria-current");
    expect(linkFor("Stats")).toHaveAttribute("aria-current", "page");
  });

  it("exposes a labelled primary nav", () => {
    usePathname.mockReturnValue("/");
    const { container } = render(<BottomNav />);
    const nav = within(container).getByLabelText("Primary");
    expect(nav.tagName).toBe("NAV");
  });
});
