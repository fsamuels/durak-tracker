import type { Metadata } from "next";

import { aboutFacts, fmt, formatPlayTime } from "@/lib/about-facts";
import { readBuildInfo } from "@/lib/build-info";
import { getAppStats } from "@/lib/data/app-stats";
import {
  TRUMP_SUIT_NAMES,
  TRUMP_SUIT_SYMBOLS,
  type TrumpSuit,
} from "@/lib/validation/game";

import { LocalTime } from "./local-time";

export const metadata: Metadata = {
  title: "About — Durak Tracker",
};

const REPO_URL = "https://github.com/fsamuels/durak-tracker";

// Coverage areas from src/lib/build-info.ts's coverageArea().
const AREA_LABELS: Record<string, string> = {
  app: "Routes",
  components: "Components",
  lib: "Lib",
  "lib/data": "Data",
  "lib/validation": "Validation",
  "lib/supabase": "Supabase",
  src: "Proxy",
};
const areaLabel = (area: string) => AREA_LABELS[area] ?? area;

const SUITS: TrumpSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const RED_SUITS = new Set<TrumpSuit>(["hearts", "diamonds"]);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-zinc-500">{children}</h2>;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface flex flex-col gap-0.5 rounded-2xl px-4 py-3">
      <span className="text-2xl font-semibold tracking-tight text-black tabular-nums dark:text-zinc-50">
        {value}
      </span>
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}

function Bar({
  label,
  pct,
  value,
}: {
  label: React.ReactNode;
  pct: number;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate text-zinc-700 dark:text-zinc-300">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <span
          className="block h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </span>
      <span className="min-w-12 text-right text-zinc-500 tabular-nums dark:text-zinc-400">
        {value}
      </span>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="min-w-0 break-words text-black dark:text-zinc-50">
        {children}
      </dd>
    </>
  );
}

export default async function AboutPage() {
  const build = readBuildInfo();
  const stats = await getAppStats();
  const facts = aboutFacts(stats, build?.code ?? null);

  const dataTiles = stats
    ? [
        { label: "Groups", value: fmt(stats.groups) },
        { label: "Accounts", value: fmt(stats.accounts) },
        { label: "Games", value: fmt(stats.games) },
        { label: "Players", value: fmt(stats.players) },
        { label: "Guests", value: fmt(stats.guestPlayers) },
        { label: "Seats taken", value: fmt(stats.seats) },
        { label: "Time played", value: formatPlayTime(stats.playedSeconds) },
        { label: "Largest table", value: fmt(stats.largestTable) },
      ]
    : [];
  const maxTrump = stats ? Math.max(1, ...Object.values(stats.trumpGames)) : 1;

  const code = build?.code;
  const codeTiles = code
    ? [
        { label: "Lines of code", value: fmt(code.totalLines) },
        { label: "Source files", value: fmt(code.totalFiles) },
        { label: "Routes", value: fmt(code.routes) },
        { label: "Components", value: fmt(code.components) },
        { label: "Server actions", value: fmt(code.serverActions) },
        { label: "DB migrations", value: fmt(code.migrations) },
        { label: "SQL functions", value: fmt(code.sqlFunctions) },
        { label: "Test files", value: fmt(code.testFiles) },
        { label: "Test cases", value: fmt(code.testCases) },
        {
          label: "Dependencies",
          value: `${build.dependencies} + ${build.devDependencies} dev`,
        },
      ]
    : [];
  const maxLanguageLines = code
    ? Math.max(1, ...code.languages.map((l) => l.lines))
    : 1;

  const coverage = build?.coverage ?? null;
  const stack = build
    ? (
        [
          ["Next.js", build.nextVersion],
          ["React", build.reactVersion],
          ["Tailwind", build.tailwindVersion],
          ["supabase-js", build.supabaseJsVersion],
        ] as const
      ).filter(([, version]) => !!version)
    : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          About
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Durak Tracker
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A mobile-first tracker for Durak games among friends. Created by{" "}
          <strong>Forrest Samuels</strong> and <strong>Claude</strong>.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>This build</SectionTitle>
        {build ? (
          <dl className="card-surface grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-2xl px-4 py-3 text-sm">
            <Row label="Commit">
              {build.commitSha ? (
                <a
                  href={`${REPO_URL}/commit/${build.commitSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline underline-offset-4"
                >
                  {build.commitShortSha}
                </a>
              ) : (
                "unknown"
              )}
              {build.commitMessage && (
                <span className="block text-zinc-500 dark:text-zinc-400">
                  {build.commitMessage}
                </span>
              )}
            </Row>
            {build.branch && build.branch !== "HEAD" && (
              <Row label="Branch">
                <span className="font-mono">{build.branch}</span>
              </Row>
            )}
            <Row label="Built">
              <LocalTime iso={build.builtAt} relative />
            </Row>
            {build.commitDate && (
              <Row label="Committed">
                <LocalTime iso={build.commitDate} />
              </Row>
            )}
            {build.commitCount && (
              <Row label="Commits">{fmt(build.commitCount)}</Row>
            )}
            {build.firstCommitDate && (
              <Row label="First commit">
                <LocalTime iso={build.firstCommitDate} relative />
              </Row>
            )}
            <Row label="Stack">
              <span className="flex flex-wrap gap-1.5">
                {[
                  ...stack.map(([name, version]) => `${name} ${version}`),
                  "Supabase",
                  "Vercel",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
                  >
                    {item}
                  </span>
                ))}
              </span>
            </Row>
          </dl>
        ) : (
          <p className="card-surface rounded-2xl px-4 py-3 text-sm text-zinc-500">
            Build info isn&rsquo;t available for this build.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>By the numbers</SectionTitle>
        {stats ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {dataTiles.map((tile) => (
                <Tile key={tile.label} {...tile} />
              ))}
            </div>
            <div className="card-surface flex flex-col gap-2 rounded-2xl px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Trump suits called
              </p>
              {SUITS.map((suit) => (
                <Bar
                  key={suit}
                  label={
                    <>
                      <span
                        aria-hidden
                        className={
                          RED_SUITS.has(suit)
                            ? "text-red-600 dark:text-red-500"
                            : ""
                        }
                      >
                        {TRUMP_SUIT_SYMBOLS[suit]}
                      </span>{" "}
                      {TRUMP_SUIT_NAMES[suit]}
                    </>
                  }
                  pct={(stats.trumpGames[suit] / maxTrump) * 100}
                  value={fmt(stats.trumpGames[suit])}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="card-surface rounded-2xl px-4 py-3 text-sm text-zinc-500">
            App-wide totals are on the way.
          </p>
        )}
      </section>

      {code && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Under the hood</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {codeTiles.map((tile) => (
              <Tile key={tile.label} {...tile} />
            ))}
          </div>
          <div className="card-surface flex flex-col gap-2 rounded-2xl px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Lines by language
            </p>
            {code.languages.map((lang) => (
              <Bar
                key={lang.language}
                label={lang.language}
                pct={(lang.lines / maxLanguageLines) * 100}
                value={fmt(lang.lines)}
              />
            ))}
          </div>
          <div className="card-surface flex flex-col gap-2 rounded-2xl px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Test coverage
            </p>
            {coverage ? (
              <>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-black tabular-nums dark:text-zinc-50">
                    {coverage.lines}%
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    of lines ({fmt(coverage.coveredLines)} of{" "}
                    {fmt(coverage.totalLines)})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["Statements", coverage.statements],
                      ["Branches", coverage.branches],
                      ["Functions", coverage.functions],
                    ] as const
                  ).map(([label, value]) => (
                    <span
                      key={label}
                      className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
                    >
                      {label} {value}%
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {coverage.areas.map((area) => (
                    <Bar
                      key={area.area}
                      label={areaLabel(area.area)}
                      pct={area.pct}
                      value={`${Math.round(area.pct)}%`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Vitest unit and component tests across every file in src/;
                  files no test loads count as 0%. Database invariants are
                  verified separately against the live DB and aren&rsquo;t
                  included.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Coverage wasn&rsquo;t measured for this build.
              </p>
            )}
          </div>
        </section>
      )}

      {facts.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Fun facts</SectionTitle>
          <ul className="card-surface flex list-disc flex-col gap-1.5 rounded-2xl py-3 pr-4 pl-8 text-sm text-zinc-700 dark:text-zinc-300">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-sm">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 underline underline-offset-4 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          View the source on GitHub
        </a>
      </p>
    </main>
  );
}
