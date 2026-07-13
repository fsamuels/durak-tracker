import { describe, expect, it } from "vitest";

import { config as proxyConfig } from "@/proxy";

import { isPublicPath } from "./middleware";

// The PWA assets the browser fetches without auth cookies. If any of these
// gets funneled through the auth redirect, Chrome sees the login page instead
// of the asset and stops considering the app installable (the original bug:
// the matcher comment claimed manifest/icons were excluded but the regex
// didn't exclude them).
const PWA_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/sw.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

/**
 * Approximates Next's matcher semantics: each matcher entry is compiled as a
 * full-path match (path-to-regexp), so `^...$`-anchoring the pattern is close
 * enough for these literal-prefix negative-lookahead patterns.
 */
function matcherRuns(pathname: string): boolean {
  return proxyConfig.matcher.some((pattern) =>
    new RegExp(`^${pattern}$`).test(pathname),
  );
}

describe("proxy matcher", () => {
  it.each(PWA_ASSET_PATHS)("skips the middleware entirely for %s", (path) => {
    expect(matcherRuns(path)).toBe(false);
  });

  it.each(["/", "/games", "/stats", "/group/abc", "/login"])(
    "still runs the middleware for app route %s",
    (path) => {
      expect(matcherRuns(path)).toBe(true);
    },
  );
});

describe("isPublicPath (defense-in-depth if the matcher drifts)", () => {
  it.each([...PWA_ASSET_PATHS, "/login", "/auth/callback", "/privacy"])(
    "treats %s as public",
    (path) => {
      expect(isPublicPath(path)).toBe(true);
    },
  );

  it.each(["/", "/games", "/stats", "/group/abc"])(
    "keeps %s behind auth",
    (path) => {
      expect(isPublicPath(path)).toBe(false);
    },
  );
});
