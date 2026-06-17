import { describe, it, expect } from "vitest";

import { claimTokenSchema, claimPlayerIdSchema } from "./claim";

describe("claim id schemas", () => {
  it("accepts a non-version-conformant seed GUID", () => {
    // The DB has 8-4-4-4-12 GUIDs that aren't RFC-9562 version-conformant;
    // z.guid() must accept them where strict z.uuid() would not.
    const seedId = "a0000000-0000-0000-0000-000000000001";
    expect(claimTokenSchema.safeParse(seedId).success).toBe(true);
    expect(claimPlayerIdSchema.safeParse(seedId).success).toBe(true);
  });

  it("accepts a standard v4 UUID", () => {
    expect(
      claimTokenSchema.safeParse("3f1e9c2a-7b4d-4e2f-9a1c-2d3e4f5a6b7c")
        .success,
    ).toBe(true);
  });

  it("rejects a non-GUID string", () => {
    expect(claimTokenSchema.safeParse("not-a-guid").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(claimPlayerIdSchema.safeParse("").success).toBe(false);
  });
});
