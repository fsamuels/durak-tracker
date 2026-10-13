"use client";

import { useSyncExternalStore } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const subscribe = () => () => {};
// Captured once per page load: a stable snapshot for useSyncExternalStore,
// and "now" for the relative suffix without an impure call during render.
let clientNow: number | null = null;
const getClientNow = () => (clientNow ??= Date.now());
const getServerNow = () => null;

/**
 * A timestamp in the viewer's locale and timezone, which the server doesn't
 * know — so it renders as a plain UTC date during SSR and switches to local
 * formatting on the client, avoiding a hydration mismatch. With `relative`,
 * appends "(3 days ago)" once on the client.
 */
export function LocalTime({
  iso,
  relative = false,
}: {
  iso: string;
  relative?: boolean;
}) {
  const now = useSyncExternalStore(subscribe, getClientNow, getServerNow);
  if (now === null) return <time dateTime={iso}>{iso.slice(0, 10)}</time>;

  const formatted = new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  const ago =
    days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;

  return (
    <time dateTime={iso}>
      {formatted}
      {relative && <span className="text-zinc-500"> ({ago})</span>}
    </time>
  );
}
