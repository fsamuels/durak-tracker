import { describe, it, expect } from "vitest";

import { isAdmin } from "./admin";

describe("isAdmin", () => {
  it("recognizes the admin email", () => {
    expect(isAdmin({ email: "fsamuels@gmail.com" })).toBe(true);
  });

  it("is case-insensitive on the email", () => {
    expect(isAdmin({ email: "FSamuels@Gmail.com" })).toBe(true);
  });

  it("rejects non-admin users", () => {
    expect(isAdmin({ email: "someone@example.com" })).toBe(false);
  });

  it("rejects users without an email", () => {
    expect(isAdmin({ email: undefined })).toBe(false);
  });

  it("rejects null/undefined users", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
