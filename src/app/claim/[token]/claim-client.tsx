"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { claimPlayerAction } from "./actions";

/**
 * Sign in with Google, returning to this claim page afterwards. We route the
 * OAuth callback through /auth/callback with a `next` back to /claim/<token> so
 * the signed-in user lands on the confirm step.
 */
export function ClaimSignInButton({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const next = encodeURIComponent(`/claim/${token}`);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={signIn}
        disabled={pending}
        className="btn-brand flex h-12 items-center justify-center rounded-full px-5 font-medium disabled:opacity-60"
      >
        {pending ? "Redirecting…" : "Sign in with Google to claim"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
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
