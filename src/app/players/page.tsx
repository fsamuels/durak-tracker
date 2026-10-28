import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, PageHeader, PageShell } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getCurrentGroup } from "@/lib/data/groups";
import { getGroupRoster } from "@/lib/data/players";
import { createClient } from "@/lib/supabase/server";
import { cardClass, cx, nameLinkClass } from "@/lib/ui";

import { AddPlayerForm } from "./add-player-form";
import { ClaimLinkButton } from "./claim-link-button";

export default async function PlayersPage() {
  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: players }, avatars, { roster }] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, auth_user_id")
      .eq("group_id", group.id)
      .order("display_name", { ascending: true }),
    getGroupAvatars(group.id),
    getGroupRoster(group.id),
  ]);
  const gamesPlayed = new Map(roster.map((r) => [r.id, r.games_played]));

  return (
    <PageShell>
      <PageHeader
        title="Players"
        description={
          <>
            Everyone in <span className="font-medium">{group.name}</span> who
            can appear in a game. Add guests the same way — they don&apos;t need
            an account.
          </>
        }
      />

      <AddPlayerForm />

      <ul className="flex flex-col gap-2">
        {(players ?? []).map((p) => {
          const count = gamesPlayed.get(p.id) ?? 0;
          return (
            <li
              key={p.id}
              className={cx(
                cardClass,
                "flex items-center justify-between gap-3 px-4 py-3",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={avatars.get(p.id)} name={p.display_name} />
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/stats/players/${p.id}`}
                    className={cx(
                      nameLinkClass,
                      "truncate text-sm font-medium text-black dark:text-zinc-50",
                    )}
                  >
                    {p.display_name}
                  </Link>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {count} game{count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {!p.auth_user_id && (
                <div className="flex flex-col items-end gap-1">
                  <Badge>guest</Badge>
                  <ClaimLinkButton
                    playerId={p.id}
                    playerName={p.display_name}
                  />
                </div>
              )}
            </li>
          );
        })}
        {(!players || players.length === 0) && (
          <EmptyState as="li">
            No players yet. Add a few to start logging games.
          </EmptyState>
        )}
      </ul>
    </PageShell>
  );
}
