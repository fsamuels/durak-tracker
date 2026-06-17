import { describe, it, expect } from "vitest";

import { addPlayerSchema, MAX_PLAYER_NAME } from "./player";

describe("addPlayerSchema", () => {
  it("trims and accepts a normal name", () => {
    const r = addPlayerSchema.safeParse({ displayName: "  Ann  " });
    expect(r.success).toBe(true);
    expect(r.data?.displayName).toBe("Ann");
  });

  it("rejects an empty name", () => {
    expect(addPlayerSchema.safeParse({ displayName: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(addPlayerSchema.safeParse({ displayName: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a name exactly at the max length", () => {
    const name = "a".repeat(MAX_PLAYER_NAME);
    expect(addPlayerSchema.safeParse({ displayName: name }).success).toBe(true);
  });

  it("rejects a name over the max length", () => {
    const name = "a".repeat(MAX_PLAYER_NAME + 1);
    expect(addPlayerSchema.safeParse({ displayName: name }).success).toBe(
      false,
    );
  });
});
