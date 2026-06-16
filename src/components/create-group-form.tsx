"use client";

import { useActionState, useEffect, useRef } from "react";

import { createGroupAction, type CreateGroupState } from "@/app/actions";

const initialState: CreateGroupState = { error: null };

/**
 * Create-a-group form, shared by onboarding (first group) and the Manage group
 * page (additional groups). Captures the creator's browser timezone for
 * deterministic stat buckets and an optional display name.
 */
export function CreateGroupForm({
  defaultDisplayName,
  submitLabel = "Create group",
  autoFocus = false,
}: {
  defaultDisplayName?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createGroupAction,
    initialState,
  );
  const timezoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Capture the creator's browser timezone for deterministic stat buckets.
    // Write the DOM value directly (no React state) to avoid an SSR hydration
    // mismatch between the server's tz and the browser's.
    if (!timezoneRef.current) return;
    try {
      timezoneRef.current.value =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      timezoneRef.current.value = "UTC";
    }
  }, []);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input
        type="hidden"
        name="timezone"
        defaultValue="UTC"
        ref={timezoneRef}
      />

      <label className="flex flex-col gap-1 text-sm font-medium">
        Group name
        <input
          name="name"
          required
          autoFocus={autoFocus}
          placeholder="Run Club"
          className="h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Your display name
        <input
          name="display_name"
          defaultValue={defaultDisplayName}
          placeholder="What should the group call you?"
          className="h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-brand mt-2 h-12 rounded-full px-5 text-base font-semibold"
      >
        {pending ? "Creating…" : submitLabel}
      </button>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
