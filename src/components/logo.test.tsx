import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { Logo } from "./logo";

describe("Logo", () => {
  it("renders the brand mark as a decorative image", () => {
    const { container } = render(<Logo />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "/icon.svg");
    // Decorative: the adjacent wordmark/title carries the accessible name.
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden");
    expect(img).toHaveAttribute("width", "24");
    expect(img).toHaveAttribute("height", "24");
  });

  it("sizes via the size prop and merges extra classes", () => {
    const { container } = render(<Logo size={56} className="shadow" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("width", "56");
    expect(img).toHaveAttribute("height", "56");
    expect(img?.className).toContain("rounded-[22%]");
    expect(img?.className).toContain("shadow");
  });
});
