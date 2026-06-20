import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("renders the picture when a src is given", () => {
    const { container } = render(
      <Avatar src="https://example.com/pic.jpg" name="Alex Smith" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.com/pic.jpg");
    // Decorative: the name is shown next to it, so alt is empty and the picture
    // loads without leaking a referrer (Google's CDN 403s otherwise).
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it("falls back to initials when there is no src", () => {
    const { container } = render(<Avatar name="Alex Smith" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("uses the first two letters for a single-word name", () => {
    render(<Avatar name="Madonna" />);
    expect(screen.getByText("MA")).toBeInTheDocument();
  });

  it("treats null/undefined src as no picture", () => {
    const { container } = render(<Avatar src={null} name="Jo" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("shows a placeholder for an empty name", () => {
    render(<Avatar name="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
