"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OAuthButtons } from "@/components/oauth-buttons";

import { claimPlayerAction } from "./actions";

/**
 * Sign in to claim, returning to this claim page afterwards. The OAuth callback
 * is routed through /auth/callback with a `next` back to /claim/<token> so the
 * signed-in user lands on the confirm step. Supports Google, Facebook and
 * Discord (see OAuthButtons).
 */
export function ClaimSignInButton({ token }: { token: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Sign in to claim this player:
      </p>
      <OAuthButtons next={`/claim/${token}`} />
    </div>
  );
}

/** Confirm-and-claim button for a signed-in, not-yet-member user. */
export function ClaimButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setPending(true);
    setError(null);
    const res = await claimPlayerAction(token);
    if (res.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={claim}
        disabled={pending}
        className="btn-brand flex h-12 items-center justify-center rounded-full px-5 font-medium disabled:opacity-60"
      >
        {pending ? "Claiming…" : "Claim this player"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
