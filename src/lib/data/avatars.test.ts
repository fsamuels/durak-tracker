import { describe, it, expect, vi, beforeEach } from "vitest";

import { getGroupAvatars, pickAvatarUrl } from "./avatars";

const rpc = vi.fn();

// getGroupAvatars goes through the RLS-scoped server client; we only care that
// it maps the RPC rows into a player-id → url map, so stub the client.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc }),
}));

describe("pickAvatarUrl", () => {
  it("prefers avatar_url", () => {
    expect(
      pickAvatarUrl({ avatar_url: "https://a/pic", picture: "https://b/pic" }),
    ).toBe("https://a/pic");
  });

  it("falls back to picture when avatar_url is absent", () => {
    expect(pickAvatarUrl({ picture: "https://b/pic" })).toBe("https://b/pic");
  });

  it("ignores empty, non-string, and missing values", () => {
    expect(pickAvatarUrl({ avatar_url: "" })).toBeNull();
    expect(pickAvatarUrl({ avatar_url: 42 })).toBeNull();
    expect(pickAvatarUrl({})).toBeNull();
    expect(pickAvatarUrl(null)).toBeNull();
    expect(pickAvatarUrl(undefined)).toBeNull();
  });
});

describe("getGroupAvatars", () => {
  beforeEach(() => rpc.mockReset());

  it("maps rows to a player-id → url map", async () => {
    rpc.mockResolvedValue({
      data: [
        { player_id: "p1", avatar_url: "https://a/1" },
        { player_id: "p2", avatar_url: "https://a/2" },
      ],
      error: null,
    });

    const avatars = await getGroupAvatars("g1");

    expect(rpc).toHaveBeenCalledWith("group_player_avatars", {
      p_group_id: "g1",
    });
    expect(avatars.get("p1")).toBe("https://a/1");
    expect(avatars.get("p2")).toBe("https://a/2");
    expect(avatars.size).toBe(2);
  });

  it("skips rows with no url and tolerates a null result", async () => {
    rpc.mockResolvedValue({
      data: [
        { player_id: "p1", avatar_url: null },
        { player_id: "p2", avatar_url: "https://a/2" },
      ],
      error: null,
    });
    let avatars = await getGroupAvatars("g1");
    expect(avatars.has("p1")).toBe(false);
    expect(avatars.get("p2")).toBe("https://a/2");

    rpc.mockResolvedValue({ data: null, error: null });
    avatars = await getGroupAvatars("g1");
    expect(avatars.size).toBe(0);
  });
});
