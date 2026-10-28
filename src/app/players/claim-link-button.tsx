"use client";

import { useState } from "react";

import { FormMessage } from "@/components/ui";
import { buttonClass } from "@/lib/ui";

import { createPlayerClaimAction } from "./actions";

type Shared = "idle" | "copied";

/**
 * For a guest player: mint a single-use claim link and let the member share it.
 * Uses the Web Share API when available (covers text / email / Messenger per the
 * roadmap), falling back to copy-to-clipboard. The absolute URL is built from
 * the current origin so it works in dev and on the deployed app.
 */
export function ClaimLinkButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<Shared>("idle");

  async function generate() {
    setPending(true);
    setError(null);
    const res = await createPlayerClaimAction(playerId);
    setPending(false);
    if (res.error || !res.token) {
      setError(res.error ?? "Could not create a link.");
      return;
    }
    const link = `${window.location.origin}/claim/${res.token}`;
    setUrl(link);
    await share(link);
  }

  async function share(link: string) {
    const message = `Claim your player "${playerName}" in Durak Tracker`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Durak Tracker",
          text: message,
          url: link,
        });
        return;
      } catch {
        // User cancelled the share sheet, or it failed — fall through to copy.
      }
    }
    await copy(link);
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setShared("copied");
      setTimeout(() => setShared("idle"), 2000);
    } catch {
      // Clipboard blocked — the link stays visible below for manual copying.
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={generate}
        disabled={pending}
        className={buttonClass("outline", "sm")}
      >
        {pending
          ? "Creating…"
          : url
            ? shared === "copied"
              ? "Copied!"
              : "Share again"
            : "Share claim link"}
      </button>
      {url && (
        <button
          onClick={() => copy(url)}
          title="Click to copy"
          className="max-w-[12rem] truncate text-right text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          {url}
        </button>
      )}
      {error && (
        <FormMessage className="text-right text-xs">{error}</FormMessage>
      )}
    </div>
  );
}
