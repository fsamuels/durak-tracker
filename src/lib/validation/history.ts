import { z } from "zod";

/** Selectable look-back windows for the game history list. */
export const HISTORY_PERIODS = ["week", "month", "all"] as const;

export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

/** The default window when none is specified in the URL. */
export const DEFAULT_HISTORY_PERIOD: HistoryPeriod = "month";

/**
 * Period filter for the game history list. A single rolling window relative to
 * "now"; empty/missing/invalid values fall back to the default (past month).
 * The window's start is resolved to a wall-clock day in the group's timezone
 * (see `periodStartDate` in `@/lib/time`).
 */
export const historyFilterSchema = z.object({
  period: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(HISTORY_PERIODS).catch(DEFAULT_HISTORY_PERIOD),
  ),
});

export type HistoryFilter = z.infer<typeof historyFilterSchema>;
