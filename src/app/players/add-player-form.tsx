"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { addPlayerSchema, type AddPlayerInput } from "@/lib/validation/player";

import { addPlayerAction } from "./actions";

export function AddPlayerForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<AddPlayerInput>({
    resolver: zodResolver(addPlayerSchema),
    defaultValues: { displayName: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await addPlayerAction(values);
    if (res.error) {
      setError("root", { message: res.error });
      return;
    }
    reset({ displayName: "" });
    setFocus("displayName");
  });

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <div className="flex gap-2">
        <input
          {...register("displayName")}
          placeholder="Add a player or guest…"
          aria-label="Player name"
          autoComplete="off"
          className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 shrink-0 rounded-full bg-black px-5 font-medium text-white transition-colors hover:bg-zinc-800 active:brightness-90 disabled:opacity-60 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Adding…" : "Add"}
        </button>
      </div>
      {(errors.displayName || errors.root) && (
        <p role="alert" className="text-sm text-red-600">
          {errors.displayName?.message ?? errors.root?.message}
        </p>
      )}
    </form>
  );
}
