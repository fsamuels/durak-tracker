"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { historyFilterSchema } from "@/lib/validation/history";

/**
 * Date-range filter for the history list. Pushes the chosen bounds to the URL
 * as `?start=&end=`; the server component reads + re-validates them. Kept
 * client-side only for the inputs and a friendly pre-navigation check.
 */
export function HistoryFilter({
  start,
  end,
}: {
  start?: string;
  end?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(start ?? "");
  const [to, setTo] = useState(end ?? "");
  const [error, setError] = useState<string | null>(null);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const parsed = historyFilterSchema.safeParse({ start: from, end: to });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid date range.");
      return;
    }
    setError(null);
    const params = new URLSearchParams();
    if (parsed.data.start) params.set("start", parsed.data.start);
    if (parsed.data.end) params.set("end", parsed.data.end);
    const qs = params.toString();
    router.push(qs ? `/games?${qs}` : "/games");
  }

  function clear() {
    setFrom("");
    setTo("");
    setError(null);
    router.push("/games");
  }

  const inputClass =
    "h-11 rounded-lg border border-black/15 bg-white px-3 text-base text-black dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50";

  return (
    <form onSubmit={apply} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          From
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          To
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="h-10 rounded-full bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          Apply filter
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
