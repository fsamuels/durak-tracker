"use client";

import { useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WindowWithPrompt = Window & {
  __installPrompt?: BeforeInstallPromptEvent;
};

const IOS_DISMISS_KEY = "ios-install-dismissed";

// --- Install prompt external store ---
// beforeinstallprompt fires at most once per browser session; we store it at
// the module level so it survives component re-mounts.

let _installPrompt: BeforeInstallPromptEvent | null = null;
const _promptSubscribers = new Set<() => void>();

function notifyPromptSubscribers() {
  _promptSubscribers.forEach((fn) => fn());
}

function subscribeInstallPrompt(callback: () => void): () => void {
  _promptSubscribers.add(callback);

  function handler(e: Event) {
    e.preventDefault();
    _installPrompt = e as BeforeInstallPromptEvent;
    notifyPromptSubscribers();
  }

  window.addEventListener("beforeinstallprompt", handler);

  // Pick up event pre-captured by the inline script before React hydrated.
  const win = window as WindowWithPrompt;
  if (win.__installPrompt) {
    _installPrompt = win.__installPrompt;
    delete win.__installPrompt;
    // Notify via microtask — must not call subscribers synchronously inside
    // subscribe() per the useSyncExternalStore contract.
    queueMicrotask(callback);
  }

  return () => {
    _promptSubscribers.delete(callback);
    window.removeEventListener("beforeinstallprompt", handler);
  };
}

function getInstallPromptSnapshot(): BeforeInstallPromptEvent | null {
  return _installPrompt;
}

function getInstallPromptServerSnapshot(): null {
  return null;
}

// --- iOS install hint store ---
// Checked once at subscribe time; iOS detection is stable so no re-subscription
// is needed. useSyncExternalStore gives us a SSR-compatible server snapshot.

let _showIOS: boolean | null = null;

function subscribeIOS(notify: () => void): () => void {
  void notify; // iOS detection is stable; no re-subscription needed
  if (_showIOS === null) {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(navigator as Navigator & { standalone?: boolean }).standalone;
    _showIOS = isIOS && !localStorage.getItem(IOS_DISMISS_KEY);
  }
  return () => {};
}

function getIOSSnapshot(): boolean {
  return _showIOS ?? false;
}

function getIOSServerSnapshot(): false {
  return false;
}

export function InstallPrompt({
  hasBottomNav = false,
}: {
  hasBottomNav?: boolean;
}) {
  const prompt = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptSnapshot,
    getInstallPromptServerSnapshot,
  );
  const showIOSBase = useSyncExternalStore(
    subscribeIOS,
    getIOSSnapshot,
    getIOSServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

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
        _installPrompt = null;
        notifyPromptSubscribers();
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

  if (showIOSBase && !dismissed) {
    function dismissIOS() {
      localStorage.setItem(IOS_DISMISS_KEY, "1");
      _showIOS = false;
      setDismissed(true);
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
