"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "facebook";

export default function LoginPage() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
    // On success the browser is redirected to the provider, so no further work here.
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Durak Tracker
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Sign in to track who got stuck as the durak.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => signIn("google")}
          disabled={pending !== null}
          className="flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-5 font-medium text-black transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
        <button
          onClick={() => signIn("facebook")}
          disabled={pending !== null}
          className="flex h-12 items-center justify-center rounded-full bg-[#1877F2] px-5 font-medium text-white transition-colors hover:bg-[#1568d8] disabled:opacity-60"
        >
          {pending === "facebook" ? "Redirecting…" : "Continue with Facebook"}
        </button>
      </div>

      {error && (
        <p role="alert" className="max-w-xs text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
