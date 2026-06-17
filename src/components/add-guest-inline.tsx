"use client";

import { useState } from "react";

import { addPlayerAction, type AddedPlayer } from "@/app/players/actions";
import { addPlayerSchema } from "@/lib/validation/player";

/**
 * Inline "add a guest" control for the start/finish flows: a name field + Add
 * button that reuses addPlayerAction, then hands the created player back via
 * onAdded so the form can select it without leaving the page. Validation
 * mirrors the standalone add-player form (shared addPlayerSchema).
 */
export function AddGuestInline({
  onAdded,
}: {
  onAdded: (player: AddedPlayer) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = addPlayerSchema.safeParse({ displayName: name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await addPlayerAction(parsed.data);
    setBusy(false);
    if (res.error || !res.player) {
      setError(res.error ?? "Couldn't add player.");
      return;
    }
    onAdded(res.player);
    setName("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Don't submit the outer game form when adding a guest.
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Add a guest…"
          aria-label="New guest name"
          autoComplete="off"
          className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="h-11 shrink-0 rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 active:brightness-90 disabled:opacity-60 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
