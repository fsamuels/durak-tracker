"use client";

import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";

/**
 * Controlled "chip grid" player selector. The whole roster renders as toggle
 * chips (avatar + name + ×/+ affordance) in one flex-wrap grid; a search input
 * above filters the visible chips, and selected chips sort first so who's in
 * stays visible. Selection state is owned by the caller (`selectedIds` +
 * `onToggle`); only the search text is internal.
 *
 * This is the live selector shared by the Start / Finish / Edit game forms. Its
 * look mirrors the "Chip grid" variant in the /games/selector-demo playground.
 */

export type ChipGridPlayer = {
  id: string;
  display_name: string;
  /** OAuth avatar when the player has one; null for guests / pictureless. */
  avatar_url?: string | null;
};

const inputClass =
  "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

/** A pill that toggles a player in/out. Filled = in the game. */
function PlayerChip({
  player,
  selected,
  onToggle,
}: {
  player: ChipGridPlayer;
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

export function PlayerChipGrid({
  players,
  selectedIds,
  onToggle,
  searchLabel = "Filter players",
  searchPlaceholder = "Search to filter…",
}: {
  /** Roster to render as chips. Render order = given order, selected first. */
  players: ChipGridPlayer[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const chips = useMemo(() => {
    const filtered = players.filter(
      (p) => q === "" || p.display_name.toLowerCase().includes(q),
    );
    // Stable sort keeps the given order within each group; selected float up.
    return [...filtered].sort((a, b) => {
      const aSel = selectedIds.has(a.id) ? 0 : 1;
      const bSel = selectedIds.has(b.id) ? 0 : 1;
      return aSel - bSel;
    });
  }, [players, q, selectedIds]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchLabel}
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
