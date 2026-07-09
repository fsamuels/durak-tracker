import { describe, it, expect } from "vitest";

import { addUserToGroupSchema } from "./admin";
import { MAX_PLAYER_NAME } from "./player";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const GROUP_ID = "22222222-2222-2222-2222-222222222222";
const PLAYER_ID = "33333333-3333-3333-3333-333333333333";

describe("addUserToGroupSchema", () => {
  it("accepts create-new mode with a trimmed name", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: GROUP_ID,
      playerId: "",
      displayName: "  Ann  ",
    });
    expect(r.success).toBe(true);
    expect(r.data?.playerId).toBeUndefined();
    expect(r.data?.displayName).toBe("Ann");
  });

  it("accepts link-guest mode with an empty name", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: GROUP_ID,
      playerId: PLAYER_ID,
      displayName: "",
    });
    expect(r.success).toBe(true);
    expect(r.data?.playerId).toBe(PLAYER_ID);
  });

  it("rejects create-new mode without a name", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: GROUP_ID,
      playerId: "",
      displayName: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a name over the max length", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: GROUP_ID,
      playerId: "",
      displayName: "a".repeat(MAX_PLAYER_NAME + 1),
    });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed group id", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: "not-a-guid",
      playerId: "",
      displayName: "Ann",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed player id", () => {
    const r = addUserToGroupSchema.safeParse({
      userId: USER_ID,
      groupId: GROUP_ID,
      playerId: "not-a-guid",
      displayName: "",
    });
    expect(r.success).toBe(false);
  });
});
