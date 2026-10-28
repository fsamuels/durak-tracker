"use client";

import { useActionState, useEffect, useRef } from "react";

import { createGroupAction, type CreateGroupState } from "@/app/actions";
import { Field, FormMessage } from "@/components/ui";
import { buttonClass, cx, inputClass } from "@/lib/ui";

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

      <Field label="Group name">
        <input
          name="name"
          required
          autoFocus={autoFocus}
          placeholder="Friday night cards"
          className={inputClass}
        />
      </Field>

      <Field label="Your display name" optional>
        <input
          name="display_name"
          defaultValue={defaultDisplayName}
          placeholder="What should the group call you?"
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className={cx(buttonClass("primary"), "mt-2")}
      >
        {pending ? "Creating…" : submitLabel}
      </button>

      {state.error && <FormMessage>{state.error}</FormMessage>}
    </form>
  );
}
