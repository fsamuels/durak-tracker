/**
 * Build-time facts for the About page: which commit this build came from,
 * when it was built, codebase trivia (lines of code, route/component counts,
 * test cases, …) and unit-test coverage.
 *
 * This module holds the shared types and the pure summarizers; the
 * filesystem/git walk lives in `collect-build-info.ts`, which only
 * next.config.ts imports, so none of it ends up in the server bundle. The
 * result is inlined as `process.env.BUILD_INFO` and read back here by
 * `readBuildInfo`.
 */
export type LanguageLines = {
  language: string;
  files: number;
  lines: number;
};

export type CodebaseStats = {
  languages: LanguageLines[];
  totalFiles: number;
  totalLines: number;
  /** `page.tsx` files under src/app — one per route. */
  routes: number;
  /** Non-test `.tsx` files under src/components. */
  components: number;
  /** `actions.ts` files under src/app — the server-action modules. */
  serverActions: number;
  migrations: number;
  /** Distinct SQL function names defined across the migrations. */
  sqlFunctions: number;
  testFiles: number;
  testCases: number;
  docsWords: number;
  longestFile: { path: string; lines: number } | null;
};

export type CoverageArea = {
  /** `app`, `components`, `lib`, `lib/data`, … — see `coverageArea`. */
  area: string;
  files: number;
  covered: number;
  total: number;
  pct: number;
};

export type CoverageStats = {
  lines: number;
  statements: number;
  branches: number;
  functions: number;
  coveredLines: number;
  totalLines: number;
  /** Per-area line coverage, best-covered first. */
  areas: CoverageArea[];
};

export type BuildInfo = {
  commitSha: string | null;
  commitShortSha: string | null;
  commitMessage: string | null;
  commitDate: string | null;
  branch: string | null;
  builtAt: string;
  commitCount: number | null;
  firstCommitDate: string | null;
  dependencies: number;
  devDependencies: number;
  nextVersion: string | null;
  reactVersion: string | null;
  tailwindVersion: string | null;
  supabaseJsVersion: string | null;
  code: CodebaseStats;
  coverage: CoverageStats | null;
};

type CoverageMetric = { total: number; covered: number; pct: number };
export type CoverageSummary = Record<
  string,
  Record<"lines" | "statements" | "branches" | "functions", CoverageMetric>
>;

export type SourceFile = {
  /** Repo-relative path with forward slashes, e.g. `src/app/about/page.tsx`. */
  path: string;
  content: string;
};

export const LANGUAGES: Record<string, string> = {
  ".tsx": "TSX",
  ".ts": "TypeScript",
  ".mjs": "JavaScript",
  ".js": "JavaScript",
  ".sql": "SQL",
  ".css": "CSS",
};

/** `.tsx` for `src/app/page.tsx`; empty when the file name has no dot. */
const extname = (path: string) => {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") ? path.slice(dot) : "";
};

const pct = (covered: number, total: number) =>
  total === 0 ? 0 : Math.round((covered / total) * 1000) / 10;

function countLines(content: string): number {
  if (content === "") return 0;
  const lines = content.split("\n");
  return content.endsWith("\n") ? lines.length - 1 : lines.length;
}

const isTest = (path: string) => /\.test\.tsx?$/.test(path);

/** Matches `it(`, `test(`, `it.each(…)(`-style call sites at line start. */
const TEST_CASE = /^\s*(?:it|test)(?:\.\w+)*\s*\(/gm;

/** `create [or replace] function [public.]name(` in a migration. */
const SQL_FUNCTION =
  /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(/gi;

/**
 * Pure summary of a set of source files plus the docs' markdown — split out
 * from the filesystem walk so it can be unit tested.
 */
export function summarizeCodebase(
  files: SourceFile[],
  docs: string[],
): CodebaseStats {
  const byLanguage = new Map<string, LanguageLines>();
  let longestFile: CodebaseStats["longestFile"] = null;
  let testCases = 0;
  const sqlFunctions = new Set<string>();

  for (const file of files) {
    const language = LANGUAGES[extname(file.path)];
    if (!language) continue;
    const lines = countLines(file.content);
    const entry = byLanguage.get(language) ?? { language, files: 0, lines: 0 };
    entry.files += 1;
    entry.lines += lines;
    byLanguage.set(language, entry);
    if (!longestFile || lines > longestFile.lines) {
      longestFile = { path: file.path, lines };
    }
    if (isTest(file.path)) {
      testCases += file.content.match(TEST_CASE)?.length ?? 0;
    }
    if (file.path.startsWith("supabase/migrations/")) {
      for (const match of file.content.matchAll(SQL_FUNCTION)) {
        sqlFunctions.add(match[1]!.toLowerCase());
      }
    }
  }

  const languages = [...byLanguage.values()].sort((a, b) => b.lines - a.lines);
  const count = (predicate: (path: string) => boolean) =>
    files.filter((f) => predicate(f.path)).length;

  return {
    languages,
    totalFiles: languages.reduce((sum, l) => sum + l.files, 0),
    totalLines: languages.reduce((sum, l) => sum + l.lines, 0),
    routes: count((p) => p.startsWith("src/app/") && p.endsWith("/page.tsx")),
    components: count(
      (p) =>
        p.startsWith("src/components/") && p.endsWith(".tsx") && !isTest(p),
    ),
    serverActions: count(
      (p) => p.startsWith("src/app/") && p.endsWith("/actions.ts"),
    ),
    migrations: count(
      (p) => p.startsWith("supabase/migrations/") && p.endsWith(".sql"),
    ),
    sqlFunctions: sqlFunctions.size,
    testFiles: count(isTest),
    testCases,
    docsWords: docs.reduce(
      (sum, doc) => sum + (doc.match(/\S+/g)?.length ?? 0),
      0,
    ),
    longestFile,
  };
}

/**
 * Groups a repo-relative source path into a coverage area: `src/lib/<dir>/…`
 * becomes `lib/<dir>` (data, validation, supabase), other `src/<dir>/…` paths
 * become `<dir>` (app, components, lib), and files directly in src/ are `src`.
 */
export function coverageArea(path: string): string {
  const parts = path.split("/");
  if (parts[0] !== "src") return parts[0] ?? "other";
  if (parts.length <= 2) return "src";
  if (parts[1] === "lib" && parts.length > 3) return `lib/${parts[2]}`;
  return parts[1]!;
}

/**
 * Pure summary of Vitest's `coverage-summary.json` (json-summary reporter):
 * the totals, plus line coverage grouped by area. Keys are absolute paths, so
 * `root` is stripped to group them.
 */
export function summarizeCoverage(
  summary: CoverageSummary,
  root: string,
): CoverageStats | null {
  const total = summary.total;
  if (!total) return null;
  const prefix = root.endsWith("/") ? root : `${root}/`;
  const areas = new Map<string, CoverageArea>();
  for (const [file, metrics] of Object.entries(summary)) {
    if (file === "total") continue;
    const area = coverageArea(file.split("\\").join("/").replace(prefix, ""));
    const entry = areas.get(area) ?? {
      area,
      files: 0,
      covered: 0,
      total: 0,
      pct: 0,
    };
    entry.files += 1;
    entry.covered += metrics.lines.covered;
    entry.total += metrics.lines.total;
    areas.set(area, entry);
  }
  for (const entry of areas.values()) {
    entry.pct = pct(entry.covered, entry.total);
  }
  return {
    lines: pct(total.lines.covered, total.lines.total),
    statements: pct(total.statements.covered, total.statements.total),
    branches: pct(total.branches.covered, total.branches.total),
    functions: pct(total.functions.covered, total.functions.total),
    coveredLines: total.lines.covered,
    totalLines: total.lines.total,
    areas: [...areas.values()].sort(
      (a, b) => b.pct - a.pct || b.total - a.total,
    ),
  };
}

/**
 * Reads the build info next.config.ts inlined as `process.env.BUILD_INFO`.
 * Null outside a Next build (e.g. under Vitest) or if it fails to parse.
 */
export function readBuildInfo(raw = process.env.BUILD_INFO): BuildInfo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BuildInfo;
  } catch {
    return null;
  }
}
