"use client";

import { useState } from "react";

import { addPlayerAction, type AddedPlayer } from "@/app/players/actions";
import { FormMessage } from "@/components/ui";
import { buttonClass, cx, inputClass } from "@/lib/ui";
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
          className={cx(inputClass, "flex-1")}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className={buttonClass("solid")}
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
