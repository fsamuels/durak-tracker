"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Facebook is intentionally deferred (provider not enabled in Supabase yet);
// re-add "facebook" here and its button below once it's configured.
type Provider = "google";

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
    <main className="app-bg flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-5xl" aria-hidden>
          🃏
        </span>
        <h1 className="text-brand-gradient text-4xl font-bold tracking-tight">
          Durak Tracker
        </h1>
        <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
          Sign in to track who got stuck as the durak.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => signIn("google")}
          disabled={pending !== null}
          className="card-surface flex h-12 items-center justify-center gap-3 rounded-full px-5 font-medium text-black transition-colors hover:brightness-95 disabled:opacity-60 dark:text-zinc-50"
        >
          <GoogleIcon className="size-5 shrink-0" />
          {pending === "google" ? "Redirecting…" : "Continue with Google"}
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

/** Official multicolor Google "G" mark. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
