"use client";

/**
 * Interactive playground for player-selection patterns. Three selection variants
 * share the group's **real** roster (passed in from the server, ranked by
 * games-played) so you can feel each on a phone-width screen, and a mode toggle
 * flips between the two real flows:
 *
 *   • Pick players   — Start / Edit game (just who's in)
 *   • Record result  — Finish game (who's in + per-player outcome)
 *
 * Selection variants:
 *   1. Regulars + Search  — top players as one-tap chips, search reveals the tail
 *   2. Filter-in-place    — full tappable list, search narrows it
 *   3. Chip grid          — whole roster as toggle chips, search filters them
 *
 * Demo-only: selection / outcome / guest state is all local React state —
 * reading the roster is the only real data; nothing here is submitted or
 * persisted, and adding a guest appends to the in-memory roster (no DB write).
 */

import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import { outcomeCountError, type Outcome } from "@/lib/validation/game";

import { REGULARS_COUNT, type DemoPlayer } from "./players";

type Variant = "regulars" | "filter" | "grid";
type Mode = "pick" | "finish";

const VARIANTS: { id: Variant; label: string; blurb: string }[] = [
  {
    id: "regulars",
    label: "Regulars + Search",
    blurb:
      "Your dozen most-played players are one-tap chips. Search reaches the long tail; anyone added from it shows under “Also in”.",
  },
  {
    id: "filter",
    label: "Filter-in-place",
    blurb:
      "The whole roster is a tappable list by default (the old click-the-list feel). Typing narrows it. Selected float to the top.",
  },
  {
    id: "grid",
    label: "Chip grid",
    blurb:
      "Everyone is a toggle chip in one grid — selection is just fill state. Search filters the visible chips. Selected sort first.",
  },
];

const inputClass =
  "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

function matches(p: DemoPlayer, q: string) {
  return p.display_name.toLowerCase().includes(q);
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** A pill that toggles a player in/out. Filled = in the game. */
function PlayerChip({
  player,
  selected,
  onToggle,
}: {
  player: DemoPlayer;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        selected
          ? "border-transparent bg-black text-white dark:bg-zinc-50 dark:text-black"
          : "card-surface border-black/10 text-black hover:brightness-95 dark:border-white/10 dark:text-zinc-50"
      }`}
    >
      <Avatar src={player.avatar_url} name={player.display_name} size="sm" />
      <span>{player.display_name}</span>
      <span aria-hidden className="text-base leading-none">
        {selected ? "×" : "+"}
      </span>
    </button>
  );
}

/** Demo-only guest add: mirrors AddGuestInline's look, appends locally. */
function DemoAddGuest({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Enter a name.");
      return;
    }
    setError(null);
    onAdd(trimmed);
    setName("");
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-500">Add a guest</span>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a guest…"
          aria-label="New guest name"
          autoComplete="off"
          className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={submit}
          className="h-11 shrink-0 rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 active:brightness-90 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Add
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        <p className="text-xs text-zinc-400">
          Demo only — added to this page&apos;s roster and selected, no DB
          write.
        </p>
      )}
    </div>
  );
}

const OUTCOME_OPTS: { value: Outcome; label: string; activeClass: string }[] = [
  {
    value: "none",
    label: "—",
    activeClass: "bg-black text-white dark:bg-zinc-50 dark:text-black",
  },
  { value: "durak", label: "Durak 🃏", activeClass: "bg-rose-600 text-white" },
  {
    value: "first_out",
    label: "First out",
    activeClass: "bg-emerald-600 text-white",
  },
  {
    value: "last_out",
    label: "Last out",
    activeClass: "bg-amber-500 text-white",
  },
];

/** Segmented per-player outcome picker — one tap, single-holder roles. */
function OutcomeControl({
  value,
  onChange,
  name,
}: {
  value: Outcome;
  onChange: (o: Outcome) => void;
  name: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${name} outcome`}
      className="flex gap-1 rounded-xl bg-black/[0.04] p-1 dark:bg-white/5"
    >
      {OUTCOME_OPTS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg px-1 py-1.5 text-center text-xs font-medium transition-colors ${
              active
                ? o.activeClass
                : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Finish-mode panel: every selected player gets an outcome + live rule check. */
function ResultPanel({
  roster,
  selectedIds,
  outcomes,
  onSetOutcome,
  onRemove,
}: {
  roster: DemoPlayer[];
  selectedIds: Set<string>;
  outcomes: Record<string, Outcome>;
  onSetOutcome: (id: string, o: Outcome) => void;
  onRemove: (id: string) => void;
}) {
  const inGame = roster.filter((p) => selectedIds.has(p.id));
  const tally = {
    total: inGame.length,
    durak: inGame.filter((p) => outcomes[p.id] === "durak").length,
    firstOut: inGame.filter((p) => outcomes[p.id] === "first_out").length,
    lastOut: inGame.filter((p) => outcomes[p.id] === "last_out").length,
  };
  const error = outcomeCountError(tally);

  return (
    <div className="flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/10">
      <span className="text-sm font-medium text-zinc-500">Result</span>
      {inGame.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No players in yet — add some above to record the result.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {inGame.map((p) => (
            <li
              key={p.id}
              className="card-surface flex flex-col gap-2 rounded-2xl px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                <span className="flex-1 text-black dark:text-zinc-50">
                  {p.display_name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.display_name}`}
                  className="shrink-0 text-sm font-medium text-zinc-500 underline-offset-4 hover:text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <OutcomeControl
                name={p.display_name}
                value={outcomes[p.id] ?? "none"}
                onChange={(o) => onSetOutcome(p.id, o)}
              />
            </li>
          ))}
        </ul>
      )}
      <p className={`text-sm ${error ? "text-zinc-500" : "text-emerald-600"}`}>
        {error
          ? `${tally.total} ${tally.total === 1 ? "player" : "players"} · ${error}`
          : `${tally.total} players · ready to finish ✓`}
      </p>
    </div>
  );
}

function SelectedFooter({ count }: { count: number }) {
  return (
    <p
      className={`text-sm ${count === 0 ? "text-red-600" : "text-emerald-600"}`}
      role={count === 0 ? "alert" : undefined}
    >
      {count === 0
        ? "Pick at least one player to start."
        : `${count} ${count === 1 ? "player" : "players"} in`}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Selection variants (who's in — outcome handled separately)          */
/* ------------------------------------------------------------------ */

type SelectionProps = {
  /** Full roster including locally-added guests. */
  roster: DemoPlayer[];
  /** The real ranked roster (no guests) — the regulars slice comes from this. */
  basePlayers: DemoPlayer[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

function SelectionRegulars({
  roster,
  basePlayers,
  selectedIds,
  onToggle,
}: SelectionProps) {
  const [search, setSearch] = useState("");

  // Regulars are the top slice of the *base* roster (guests aren't regulars).
  const regulars = useMemo(
    () => basePlayers.slice(0, REGULARS_COUNT),
    [basePlayers],
  );
  const regularIds = useMemo(
    () => new Set(regulars.map((p) => p.id)),
    [regulars],
  );

  const q = search.trim().toLowerCase();
  const results =
    q === ""
      ? []
      : roster.filter((p) => !regularIds.has(p.id) && matches(p, q));

  // Selected players who aren't in the regulars grid (search adds / guests).
  const alsoIn = roster.filter(
    (p) => selectedIds.has(p.id) && !regularIds.has(p.id),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-500">Regulars</span>
        <div className="flex flex-wrap gap-2">
          {regulars.map((p) => (
            <PlayerChip
              key={p.id}
              player={p}
              selected={selectedIds.has(p.id)}
              onToggle={() => onToggle(p.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all players…"
          aria-label="Search all players"
          autoComplete="off"
          className={inputClass}
        />
        {q !== "" &&
          (results.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onToggle(p.id);
                      setSearch("");
                    }}
                    className="card-surface flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:brightness-95"
                  >
                    <span className="flex items-center gap-2">
                      <Avatar
                        src={p.avatar_url}
                        name={p.display_name}
                        size="sm"
                      />
                      <span className="text-black dark:text-zinc-50">
                        {p.display_name}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-emerald-600">
                      {selectedIds.has(p.id) ? "✓ In" : "+ Add"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">
              No players match “{search}”.
            </p>
          ))}
      </div>

      {alsoIn.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-500">
            Also in (search &amp; guests)
          </span>
          <div className="flex flex-wrap gap-2">
            {alsoIn.map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                selected
                onToggle={() => onToggle(p.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionFilter({ roster, selectedIds, onToggle }: SelectionProps) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  // Selected first (so who's in stays visible), then the rest; search narrows.
  const list = useMemo(() => {
    const filtered = roster.filter((p) => q === "" || matches(p, q));
    return [...filtered].sort((a, b) => {
      const aSel = selectedIds.has(a.id) ? 0 : 1;
      const bSel = selectedIds.has(b.id) ? 0 : 1;
      return aSel - bSel;
    });
  }, [roster, q, selectedIds]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search to filter…"
        aria-label="Filter players"
        autoComplete="off"
        className={inputClass}
      />

      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {list.map((p) => {
          const isSel = selectedIds.has(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={isSel}
                className="card-surface flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:brightness-95"
              >
                <span className="flex items-center gap-2">
                  <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                  <span className="text-black dark:text-zinc-50">
                    {p.display_name}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    isSel
                      ? "border-transparent bg-emerald-600 text-white"
                      : "border-black/25 text-transparent dark:border-white/25"
                  }`}
                >
                  ✓
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && (
          <p className="text-sm text-zinc-500">No players match “{search}”.</p>
        )}
      </ul>
    </div>
  );
}

function SelectionGrid({ roster, selectedIds, onToggle }: SelectionProps) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const chips = useMemo(() => {
    const filtered = roster.filter((p) => q === "" || matches(p, q));
    return [...filtered].sort((a, b) => {
      const aSel = selectedIds.has(a.id) ? 0 : 1;
      const bSel = selectedIds.has(b.id) ? 0 : 1;
      return aSel - bSel;
    });
  }, [roster, q, selectedIds]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search to filter chips…"
        aria-label="Filter players"
        autoComplete="off"
        className={inputClass}
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((p) => (
          <PlayerChip
            key={p.id}
            player={p}
            selected={selectedIds.has(p.id)}
            onToggle={() => onToggle(p.id)}
          />
        ))}
        {chips.length === 0 && (
          <p className="text-sm text-zinc-500">No players match “{search}”.</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function SelectorDemo({ players }: { players: DemoPlayer[] }) {
  const [variant, setVariant] = useState<Variant>("regulars");
  const [mode, setMode] = useState<Mode>("pick");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [guests, setGuests] = useState<DemoPlayer[]>([]);

  // players = the group's real ranked roster; guests are local demo additions.
  const roster = useMemo(() => [...players, ...guests], [players, guests]);
  const active = VARIANTS.find((v) => v.id === variant)!;

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Clear any outcome when a player leaves the game.
        setOutcomes((o) => {
          if (!(id in o)) return o;
          const rest = { ...o };
          delete rest[id];
          return rest;
        });
      } else {
        next.add(id);
      }
      return next;
    });

  // Outcome roles (durak / first / last out) are single-holder: assigning one
  // to a player clears whoever held it before.
  const setOutcome = (id: string, outcome: Outcome) =>
    setOutcomes((prev) => {
      const next: Record<string, Outcome> = { ...prev };
      if (outcome === "none") {
        delete next[id];
        return next;
      }
      for (const [k, v] of Object.entries(next)) {
        if (v === outcome) delete next[k];
      }
      next[id] = outcome;
      return next;
    });

  const addGuest = (name: string) => {
    const guest: DemoPlayer = {
      id: `guest-${Date.now()}`,
      display_name: name,
      avatar_url: null,
    };
    setGuests((g) => [...g, guest]);
    setSelectedIds((prev) => new Set(prev).add(guest.id));
  };

  const selectionProps: SelectionProps = {
    roster,
    basePlayers: players,
    selectedIds,
    onToggle: toggle,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Mode: which real flow are we previewing */}
      <div
        role="tablist"
        aria-label="Flow"
        className="card-surface flex gap-1 rounded-2xl p-1"
      >
        {(
          [
            ["pick", "Pick players (Start / Edit)"],
            ["finish", "Record result (Finish)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-medium transition-colors ${
              mode === id
                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Variant switcher */}
      <div
        role="tablist"
        aria-label="Selector variant"
        className="card-surface flex gap-1 rounded-2xl p-1"
      >
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={variant === v.id}
            onClick={() => setVariant(v.id)}
            className={`flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-medium transition-colors ${
              variant === v.id
                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                : "text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">{active.blurb}</p>

      <div className="card-surface flex flex-col gap-4 rounded-2xl p-4">
        {variant === "regulars" && <SelectionRegulars {...selectionProps} />}
        {variant === "filter" && <SelectionFilter {...selectionProps} />}
        {variant === "grid" && <SelectionGrid {...selectionProps} />}

        <DemoAddGuest onAdd={addGuest} />

        {mode === "pick" ? (
          <SelectedFooter count={selectedIds.size} />
        ) : (
          <ResultPanel
            roster={roster}
            selectedIds={selectedIds}
            outcomes={outcomes}
            onSetOutcome={setOutcome}
            onRemove={toggle}
          />
        )}
      </div>
    </div>
  );
}
