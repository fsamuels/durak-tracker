import { describe, expect, it } from "vitest";

import {
  coverageArea,
  readBuildInfo,
  summarizeCodebase,
  summarizeCoverage,
} from "./build-info";

describe("summarizeCodebase", () => {
  const files = [
    { path: "src/app/page.tsx", content: "a\nb\nc\n" },
    { path: "src/app/about/page.tsx", content: "a\nb" },
    { path: "src/app/group/actions.ts", content: "x\n" },
    { path: "src/components/logo.tsx", content: "x\ny\n" },
    { path: "src/components/logo.test.tsx", content: 'it("a", () => {})\n' },
    { path: "src/lib/time.ts", content: "1\n2\n3\n4\n5\n" },
    {
      path: "src/lib/time.test.ts",
      content:
        'it("a", () => {})\n  test("b", () => {})\nit.each([1])("c", () => {})\n',
    },
    {
      path: "supabase/migrations/001_init.sql",
      content:
        "create function a() returns int;\nCREATE OR REPLACE FUNCTION public.b(x int)\n",
    },
    {
      path: "supabase/migrations/002_more.sql",
      content: "create or replace function a() returns int;\n",
    },
    { path: "README.txt", content: "ignored\n" },
  ];

  const stats = summarizeCodebase(files, ["one two three", "four\nfive"]);

  it("totals lines per language, sorted largest first", () => {
    expect(stats.languages).toEqual([
      { language: "TypeScript", files: 3, lines: 9 },
      { language: "TSX", files: 4, lines: 8 },
      { language: "SQL", files: 2, lines: 3 },
    ]);
    expect(stats.totalLines).toBe(20);
    expect(stats.totalFiles).toBe(9);
  });

  it("counts files by area", () => {
    expect(stats.routes).toBe(2);
    expect(stats.components).toBe(1);
    expect(stats.serverActions).toBe(1);
    expect(stats.migrations).toBe(2);
    expect(stats.testFiles).toBe(2);
  });

  it("counts distinct SQL functions across migrations", () => {
    expect(stats.sqlFunctions).toBe(2);
  });

  it("counts test cases, docs words and the longest file", () => {
    expect(stats.testCases).toBe(4);
    expect(stats.docsWords).toBe(5);
    expect(stats.longestFile).toEqual({ path: "src/lib/time.ts", lines: 5 });
  });

  it("handles an empty codebase", () => {
    const empty = summarizeCodebase([], []);
    expect(empty.totalLines).toBe(0);
    expect(empty.longestFile).toBeNull();
  });
});

describe("coverageArea", () => {
  it("groups src/lib subdirectories separately from other src dirs", () => {
    expect(coverageArea("src/lib/data/games.ts")).toBe("lib/data");
    expect(coverageArea("src/lib/time.ts")).toBe("lib");
    expect(coverageArea("src/app/stats/page.tsx")).toBe("app");
    expect(coverageArea("src/components/logo.tsx")).toBe("components");
    expect(coverageArea("src/proxy.ts")).toBe("src");
  });
});

describe("summarizeCoverage", () => {
  const m = (covered: number, total: number) => ({
    covered,
    total,
    pct: total ? (covered / total) * 100 : 100,
  });
  const file = (covered: number, total: number) => ({
    lines: m(covered, total),
    statements: m(covered, total),
    branches: m(0, 0),
    functions: m(0, 0),
  });

  it("totals and groups line coverage by area, best-covered first", () => {
    const stats = summarizeCoverage(
      {
        total: {
          lines: m(30, 120),
          statements: m(31, 130),
          branches: m(1, 3),
          functions: m(2, 3),
        },
        "/repo/src/lib/data/a.ts": file(18, 20),
        "/repo/src/lib/data/b.ts": file(9, 10),
        "/repo/src/app/page.tsx": file(3, 80),
        "/repo/src/proxy.ts": file(0, 4),
        "/repo/src/components/x.tsx": file(0, 6),
      },
      "/repo/",
    );
    expect(stats).toMatchObject({
      lines: 25,
      statements: 23.8,
      branches: 33.3,
      functions: 66.7,
      coveredLines: 30,
      totalLines: 120,
    });
    expect(stats?.areas).toEqual([
      { area: "lib/data", files: 2, covered: 27, total: 30, pct: 90 },
      { area: "app", files: 1, covered: 3, total: 80, pct: 3.8 },
      { area: "components", files: 1, covered: 0, total: 6, pct: 0 },
      { area: "src", files: 1, covered: 0, total: 4, pct: 0 },
    ]);
  });

  it("returns null for a report with no total", () => {
    expect(summarizeCoverage({}, "/repo")).toBeNull();
  });
});

describe("readBuildInfo", () => {
  it("parses the inlined JSON", () => {
    expect(readBuildInfo('{"commitSha":"abc"}')).toEqual({ commitSha: "abc" });
  });

  it("returns null when missing or malformed", () => {
    expect(readBuildInfo("")).toBeNull();
    expect(readBuildInfo("{not json")).toBeNull();
  });
});
