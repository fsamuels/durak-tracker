"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  triggerInstall,
  useInstallPromptEvent,
} from "@/components/install-prompt";

const ITEM_CLASS =
  "flex items-center px-4 py-2.5 text-sm text-black hover:bg-black/5 dark:text-zinc-50 dark:hover:bg-white/5";

export function NavMenu({
  isAdmin = false,
  myPlayerId = null,
}: {
  isAdmin?: boolean;
  /** The current user's player id in their active group, for the My stats link. */
  myPlayerId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Dismissing the install-prompt banner doesn't clear the captured
  // beforeinstallprompt event, so this stays available as a manual fallback
  // for whenever the browser's own heuristics decide not to show the banner.
  const installPrompt = useInstallPromptEvent();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/5 hover:text-zinc-800 active:bg-black/10 dark:hover:bg-white/5 dark:hover:text-zinc-200 dark:active:bg-white/10"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="4"
            width="14"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="2"
            y="8.25"
            width="14"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="2"
            y="12.5"
            width="14"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 min-w-44 rounded-xl border border-black/10 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-zinc-900">
          <Link
            href="/games/new"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            Start a game
          </Link>
          {myPlayerId && (
            <Link
              href={`/stats/players/${myPlayerId}`}
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              My stats
            </Link>
          )}
          <div className="my-1 border-t border-black/5 dark:border-white/10" />
          <Link
            href="/group"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            Manage group
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            Account
          </Link>
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className={ITEM_CLASS}
          >
            About
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              Admin
            </Link>
          )}
          {installPrompt && (
            <button
              onClick={() => {
                setOpen(false);
                void triggerInstall(installPrompt);
              }}
              className={`${ITEM_CLASS} w-full text-left`}
            >
              Install app
            </button>
          )}
          <div className="my-1 border-t border-black/5 dark:border-white/10" />
          <form action="/auth/signout" method="post">
            <button type="submit" className={`${ITEM_CLASS} w-full text-left`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
