/**
 * Timezone helpers for rendering and filtering games in a group's timezone.
 *
 * Games store `started_at` as a UTC instant. The history page renders and
 * filters those instants in the group's IANA timezone (`groups.timezone`),
 * so a "date" the user picks is a wall-clock day in that zone, not in UTC.
 */

import type { HistoryPeriod } from "@/lib/validation/history";

/**
 * Milliseconds to add to an instant to express it as wall-clock time in
 * `timeZone`. Derived via `Intl` so it tracks DST for the given instant.
 */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  // `hour` can come back as "24" at midnight in some environments.
  const hour = map.hour === "24" ? 0 : Number(map.hour);
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    hour,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

/** UTC instant (ISO) of `00:00` on `dateStr` (YYYY-MM-DD) in `timeZone`. */
export function zonedDayStartUtc(dateStr: string, timeZone: string): string {
  const naive = Date.parse(`${dateStr}T00:00:00Z`);
  const offset = tzOffsetMs(new Date(naive), timeZone);
  return new Date(naive - offset).toISOString();
}

/**
 * Exclusive upper bound: the UTC instant of `00:00` on the day *after*
 * `dateStr` in `timeZone`. Used so an end date includes the whole day.
 */
export function zonedDayEndUtc(dateStr: string, timeZone: string): string {
  const next = Date.parse(`${dateStr}T00:00:00Z`) + 24 * 60 * 60 * 1000;
  const offset = tzOffsetMs(new Date(next), timeZone);
  return new Date(next - offset).toISOString();
}

/** Render a UTC instant as a medium date + short time in `timeZone`. */
export function formatInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * Format a UTC ISO instant as a `datetime-local` input value (`YYYY-MM-DDTHH:mm`)
 * expressed in `timeZone`. Used to pre-fill edit forms with the correct local time.
 */
export function toDatetimeLocal(iso: string, timeZone: string): string {
  const instant = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
}

/**
 * Convert a `datetime-local` string (`YYYY-MM-DDTHH:mm`, expressed in
 * `timeZone`) to a UTC ISO instant. Inverse of `toDatetimeLocal`.
 */
export function localDatetimeToUtc(
  localDatetime: string,
  timeZone: string,
): string {
  const naive = Date.parse(`${localDatetime}:00Z`);
  const offset = tzOffsetMs(new Date(naive), timeZone);
  return new Date(naive - offset).toISOString();
}

/** Today's calendar date (YYYY-MM-DD) as it reads right now in `timeZone`. */
export function todayInTz(timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Inclusive start day (YYYY-MM-DD) for a history look-back window, in
 * `timeZone`. Returns undefined for "all" (no lower bound). Calendar-accurate:
 * "month" steps a whole month back, not a fixed day count.
 */
export function periodStartDate(
  period: HistoryPeriod,
  timeZone: string,
): string | undefined {
  if (period === "all") return undefined;

  const [y, m, d] = todayInTz(timeZone).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (period === "week") dt.setUTCDate(dt.getUTCDate() - 7);
  else dt.setUTCMonth(dt.getUTCMonth() - 1);

  return dt.toISOString().slice(0, 10);
}
