# Decisions

A running log of the reasoning behind non-obvious project decisions, per the
[shared SDLC standard](https://github.com/fsamuels/sdlc-standards)'s documentation convention
(`plugins/sdlc/standards/documentation.md`).

## Convention

- **Always append.** Take the next free ID; never renumber, never reuse a retired one.
- **`D-<N>`** for a decision that's been made. **`OQ-<N>`** for an open question, tracked here
  until it resolves into a `D-`.
- Each row carries the rationale (what was rejected, not just what was chosen) and a
  **reversibility** call — _easy_ (change in a day), _costly_ (weeks of rework), or _one-way_
  (effectively permanent). Spend deliberation proportional to reversibility, not to how
  interesting the argument is.
- Superseding a decision doesn't remove it — mark the old row superseded, point it at the new
  one, and say what survived.

This file starts empty rather than backfilled: the decisions already reflected in
[`docs/architecture.md`](architecture.md) (RLS as the authorization layer, `SECURITY INVOKER`
RPCs for multi-row writes, group-scoped `players` rows, the group-timezone metric cutoff, and so
on) predate this log and weren't recorded with their contemporaneous rationale, so writing them
in now would mean guessing at reasoning rather than reporting it. New decisions get logged here
going forward.

## Open questions

_None yet._

## Decision log

### D-1: Whole-app test coverage, measured on every build, reported but not enforced

Decided 2026-10-13 with the user, mirroring Chore Corral's D-4. Reversibility: _easy_
(a reporter entry, the `build` script and one CI line).

**The headline counts every file in `src/`, not just tested ones.** The existing
`coverage.include` (`src/**/*.{ts,tsx}`, minus tests, generated types and icon routes)
already counts files no test loads as 0%. That was about 24% of lines at the time;
the About page shows it next to a per-area breakdown (routes, components, lib, data,
validation, …) so the well-covered pure-logic layer is visible too.

**Measured during `pnpm build`, not committed.** `build` runs
`pnpm test:coverage --silent; next build`, and `collectBuildInfo` bakes
`coverage/coverage-summary.json` (the new `json-summary` reporter) into the About page,
so the number always matches the deployed commit. The `;` means a failing test never
blocks a deploy: Vitest writes no report on failure and clears the directory at the
start of each run, so the page says coverage wasn't measured instead of showing a stale
number. Committing a summary file was rejected because it goes stale as soon as someone
forgets to regenerate it. CI still fails on a failing test, because its test step runs
`pnpm test:coverage` on its own.

**No threshold.** CI prints the summary but never fails on the number. DB invariants
are verified against the live DB (see `current-status.md`), and Playwright e2e is still
planned, so a floor would push toward unit-testing UI rather than covering it the way
the project intends.
