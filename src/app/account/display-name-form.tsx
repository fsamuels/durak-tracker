"use client";

import { useActionState, useEffect, useRef } from "react";

import { updateDisplayNameAction } from "./actions";

export function DisplayNameForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(
    updateDisplayNameAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success && inputRef.current) {
      inputRef.current.blur();
    }
  }, [state?.success]);

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="card-surface flex items-center gap-2 overflow-hidden rounded-2xl px-4 py-2">
        <input
          ref={inputRef}
          name="displayName"
          type="text"
          defaultValue={currentName}
          maxLength={50}
          placeholder="Your name"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-black outline-none placeholder:text-zinc-400 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" role="status">
          Name updated.
        </p>
      )}
    </form>
  );
}
