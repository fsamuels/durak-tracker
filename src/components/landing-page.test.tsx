import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("renders the headline, sign-in options, and a fallback CTA to /login", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Durak Tracker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("links out to the Wikipedia explainer for what Durak is", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Durak" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Durak",
    );
  });
});
