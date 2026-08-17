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

_None yet._
