import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  EmptyState,
  Field,
  FormMessage,
  PageHeader,
  Section,
  StatTile,
} from "./ui";

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

describe("PageHeader", () => {
  it("renders the title as the page's h1 with an optional back link", () => {
    render(
      <PageHeader
        title="Edit game"
        description="Fix it up."
        back={{ href: "/games/1", label: "Game details" }}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Edit game" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Fix it up.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Game details" }),
    ).toHaveAttribute("href", "/games/1");
  });

  it("omits the back link when none is given", () => {
    render(<PageHeader title="Players" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("Section", () => {
  it("renders a muted h2 and an optional action link", () => {
    render(
      <Section
        title="Recent games"
        action={{ href: "/games", label: "View all →" }}
      >
        <p>body</p>
      </Section>,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Recent games" }),
    ).toHaveClass("text-sm", "text-zinc-500");
    expect(screen.getByRole("link", { name: "View all →" })).toHaveAttribute(
      "href",
      "/games",
    );
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders as the requested element so it can sit inside a <ul>", () => {
    render(
      <ul>
        <EmptyState as="li">Nothing yet.</EmptyState>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Nothing yet.");
  });
});

describe("FormMessage", () => {
  it("announces errors as alerts", () => {
    render(<FormMessage>Broken.</FormMessage>);
    expect(screen.getByRole("alert")).toHaveTextContent("Broken.");
  });

  it("announces success as a status", () => {
    render(<FormMessage tone="success">Saved.</FormMessage>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Field", () => {
  it("labels its control, marks it optional, and shows the error", () => {
    render(
      <Field label="Notes" optional error="Too long.">
        <textarea />
      </Field>,
    );
    expect(screen.getByRole("textbox", { name: /Notes/ })).toBeInTheDocument();
    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.getByText("Too long.")).toBeInTheDocument();
  });
});

describe("StatTile", () => {
  it("shows the value, label and sub line", () => {
    render(<StatTile label="Durak rate" value="40%" sub="2 of 5" />);
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Durak rate")).toBeInTheDocument();
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
  });

  it("uses the brand gradient only when highlighted", () => {
    const { rerender } = render(<StatTile label="Games" value={3} />);
    expect(screen.getByText("3")).not.toHaveClass("text-brand-gradient");
    rerender(<StatTile label="Games" value={3} highlight />);
    expect(screen.getByText("3")).toHaveClass("text-brand-gradient");
  });
});
