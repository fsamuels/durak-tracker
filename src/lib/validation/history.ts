import { z } from "zod";

/** A `YYYY-MM-DD` calendar date, or omitted. Empty strings become undefined. */
const optionalDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
    .optional(),
);

/**
 * Date-range filter for the game history list. Both bounds are optional and
 * interpreted as wall-clock days in the group's timezone (see `@/lib/time`).
 */
export const historyFilterSchema = z
  .object({
    start: optionalDate,
    end: optionalDate,
  })
  .refine((d) => !d.start || !d.end || d.start <= d.end, {
    message: "Start date can't be after the end date.",
    path: ["end"],
  });

export type HistoryFilter = z.infer<typeof historyFilterSchema>;
