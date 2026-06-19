"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithPrompt = Window & {
  __installPrompt?: BeforeInstallPromptEvent;
};

const IOS_DISMISS_KEY = "ios-install-dismissed";

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(navigator as Navigator & { standalone?: boolean }).standalone
  );
}

export function InstallPrompt({
  hasBottomNav = false,
}: {
  hasBottomNav?: boolean;
}) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Pick up event captured by the inline script before React hydrated.
    const pre = (window as WindowWithPrompt).__installPrompt;
    if (pre) {
      setPrompt(pre);
      delete (window as WindowWithPrompt).__installPrompt;
    }

    function handler(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: no beforeinstallprompt — show manual instructions instead.
    if (isIOS() && !localStorage.getItem(IOS_DISMISS_KEY)) {
      setShowIOS(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const bottomClass = hasBottomNav
    ? "bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom)+1rem)]";

  const bannerClass = `fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-lg dark:border-white/15 dark:bg-zinc-900 ${bottomClass}`;

  if (prompt && !dismissed) {
    async function install() {
      if (!prompt) return;
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted" || outcome === "dismissed") {
        setPrompt(null);
      }
    }

    return (
      <div className={bannerClass}>
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

  if (showIOS) {
    function dismissIOS() {
      localStorage.setItem(IOS_DISMISS_KEY, "1");
      setShowIOS(false);
    }

    return (
      <div className={bannerClass}>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-black dark:text-zinc-50">
            Install Durak Tracker
          </p>
          <p className="text-xs text-zinc-500">
            Tap the Share button, then &ldquo;Add to Home Screen&rdquo;
          </p>
        </div>
        <button
          onClick={dismissIOS}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
}
