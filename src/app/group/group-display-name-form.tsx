"use client";

import { useActionState, useEffect, useRef } from "react";

import { FormMessage } from "@/components/ui";
import { buttonClass, cx, inputClass } from "@/lib/ui";

import { updateGroupDisplayNameAction } from "./actions";

export function GroupDisplayNameForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(
    updateGroupDisplayNameAction,
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
      <div className="flex gap-2">
        <input
          ref={inputRef}
          name="displayName"
          type="text"
          defaultValue={currentName}
          maxLength={60}
          placeholder="Your name in this group"
          aria-label="Display name"
          className={cx(inputClass, "min-w-0 flex-1")}
        />
        <button
          type="submit"
          disabled={pending}
          className={buttonClass("solid")}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state?.error && <FormMessage>{state.error}</FormMessage>}
      {state?.success && (
        <FormMessage tone="success">Name updated.</FormMessage>
      )}
    </form>
  );
}
