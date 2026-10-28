import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Skeleton, SkeletonList, SkeletonPage } from "./skeleton";

describe("SkeletonPage", () => {
  it("marks the page busy and announces loading once", () => {
    render(
      <SkeletonPage>
        <Skeleton />
      </SkeletonPage>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("status").parentElement).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech and pulses only when motion is OK", () => {
    const { container } = render(<Skeleton className="h-4" />);
    const block = container.firstElementChild!;
    expect(block).toHaveAttribute("aria-hidden");
    expect(block).toHaveClass("motion-safe:animate-pulse");
    expect(block).not.toHaveClass("animate-pulse");
  });

  it("uses the default radius only when the caller sets none", () => {
    const { container: plain } = render(<Skeleton className="h-4" />);
    expect(plain.firstElementChild).toHaveClass("rounded-lg");

    const { container: round } = render(
      <Skeleton className="h-8 w-8 rounded-full" />,
    );
    expect(round.firstElementChild).toHaveClass("rounded-full");
    expect(round.firstElementChild).not.toHaveClass("rounded-lg");
  });
});

describe("SkeletonList", () => {
  it("renders the requested number of rows", () => {
    const { container } = render(<SkeletonList rows={5} />);
    expect(container.firstElementChild!.children).toHaveLength(5);
  });
});
