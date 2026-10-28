import { redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";

import { SelectorDemo } from "./selector-demo";

/**
 * Throwaway playground for comparing player-selection patterns on a real
 * phone-width screen — now wired to the group's **real** roster (ranked by
 * games-played, with avatars), like the start/finish pages. Selection and
 * outcomes are still local demo state; nothing is persisted. Linked (low-key,
 * via SelectorDemoLink) from under the start/finish forms. Safe to delete once
 * a direction is chosen.
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
    <PageShell>
      <PageHeader
        back={{ href: "/games/new", label: "Start a game" }}
        title="Player selection — mockups"
        description={
          <>
            Four ways to pick who&apos;s playing, on{" "}
            <strong>{group.name}</strong>&apos;s real roster. Toggle{" "}
            <strong>Pick players</strong> vs <strong>Record result</strong> to
            preview both the Start/Edit and Finish flows, add a guest, and try
            assigning durak / first / last out. Nothing here is saved.
          </>
        }
      />

      <SelectorDemo players={players} />
    </PageShell>
  );
}
