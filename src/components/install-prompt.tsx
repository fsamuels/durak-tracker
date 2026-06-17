"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt({
  hasBottomNav = false,
}: {
  /** When the bottom tab bar is present, float above it instead of over it. */
  hasBottomNav?: boolean;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setPrompt(null);
    }
  }

  return (
    <div
      className={`fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-lg dark:border-white/15 dark:bg-zinc-900 ${
        hasBottomNav
          ? "bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]"
          : "bottom-[calc(env(safe-area-inset-bottom)+1rem)]"
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-black dark:text-zinc-50">
          Install Durak Tracker
        </p>
        <p className="text-xs text-zinc-500">Add to your home screen</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="btn-brand rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          Install
        </button>
      </div>
    </div>
  );
}
