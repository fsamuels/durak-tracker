"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormMessage } from "@/components/ui";
import { buttonClass, cx, inputClass } from "@/lib/ui";
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
          className={cx(inputClass, "flex-1")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className={buttonClass("solid")}
        >
          {isSubmitting ? "Adding…" : "Add"}
        </button>
      </div>
      {(errors.displayName || errors.root) && (
        <FormMessage>
          {errors.displayName?.message ?? errors.root?.message}
        </FormMessage>
      )}
    </form>
  );
}
