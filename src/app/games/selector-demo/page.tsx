import { redirect } from "next/navigation";

import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";

import { SelectorDemo } from "./selector-demo";

/**
 * Throwaway playground for comparing player-selection patterns on a real
 * phone-width screen — now wired to the group's **real** roster (ranked by
 * games-played, with avatars), like the start/finish pages. Selection and
 * outcomes are still local demo state; nothing is persisted. Not linked from
 * anywhere — visit /games/selector-demo directly. Safe to delete once a
 * direction is chosen.
 */
export default async function SelectorDemoPage() {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const [{ roster }, avatars] = await Promise.all([
    getGroupRoster(group.id),
    getGroupAvatars(group.id),
  ]);
  const players = roster.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: avatars.get(p.id) ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Player selection — mockups
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Three ways to pick who&apos;s playing, on{" "}
          <strong>{group.name}</strong>&apos;s real roster. Toggle{" "}
          <strong>Pick players</strong> vs <strong>Record result</strong> to
          preview both the Start/Edit and Finish flows, add a guest, and try
          assigning durak / first / last out. Nothing here is saved.
        </p>
      </div>

      <SelectorDemo players={players} />
    </main>
  );
}
