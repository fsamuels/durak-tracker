import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Avatar } from "@/components/avatar";
import { Badge, PageHeader, PageShell, Section } from "@/components/ui";
import { getGroupAvatars } from "@/lib/data/avatars";
import { getGameDetail } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { formatInTz } from "@/lib/time";
import {
  buttonClass,
  cardClass,
  cx,
  nameLinkClass,
  type BadgeTone,
} from "@/lib/ui";
import {
  OUTCOME_LABELS,
  TRUMP_SUIT_LABELS,
  type Outcome,
  type TrumpSuit,
} from "@/lib/validation/game";
import { formatDuration } from "@/lib/validation/stats";

const gameIdSchema = z.guid();

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = gameIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const group = await getCurrentGroup();
  if (!group) redirect("/onboarding");

  const [game, avatars] = await Promise.all([
    getGameDetail(group.id, parsedId.data),
    getGroupAvatars(group.id),
  ]);
  if (!game) notFound();

  const participants = game.game_players ?? [];
  const trump = game.trump_suit
    ? TRUMP_SUIT_LABELS[game.trump_suit as TrumpSuit]
    : null;
  const durationSeconds = game.ended_at
    ? (new Date(game.ended_at).getTime() -
        new Date(game.started_at).getTime()) /
      1000
    : null;

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/games", label: "Game history" }}
        title={formatInTz(game.started_at, group.timezone)}
        description={
          <>
            Game in <span className="font-medium">{group.name}</span>
          </>
        }
      />

      <Link href={`/games/new?from=${game.id}`} className={buttonClass()}>
        ↻ Play again
      </Link>

      {/* Details */}
      <section className={cx(cardClass, "flex flex-col gap-3 px-4 py-4")}>
        <Row
          label="Started"
          value={formatInTz(game.started_at, group.timezone)}
        />
        {game.ended_at && (
          <Row
            label="Ended"
            value={formatInTz(game.ended_at, group.timezone)}
          />
        )}
        {durationSeconds != null && (
          <Row label="Duration" value={formatDuration(durationSeconds)} />
        )}
        {trump && <Row label="Trump suit" value={trump} />}
        {game.deck_count != null && (
          <Row
            label="Decks"
            value={`${game.deck_count} deck${game.deck_count === 1 ? "" : "s"}`}
          />
        )}
        {game.logged_by_name && (
          <Row label="Logged by" value={game.logged_by_name} />
        )}
      </section>

      {/* Players */}
      <Section title="Players">
        <ul className="flex flex-col gap-2">
          {participants.map((gp) => {
            const name = gp.players?.display_name ?? "Unknown";
            const outcome: Outcome = gp.is_durak
              ? "durak"
              : gp.is_first_out
                ? "first_out"
                : gp.is_last_out
                  ? "last_out"
                  : "none";

            return (
              <li
                key={gp.player_id}
                className={cx(
                  cardClass,
                  "flex items-center justify-between gap-3 px-4 py-3",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar src={avatars.get(gp.player_id)} name={name} />
                  <Link
                    href={`/stats/players/${gp.player_id}`}
                    className={cx(
                      nameLinkClass,
                      "truncate font-medium text-black dark:text-zinc-50",
                    )}
                  >
                    {name}
                  </Link>
                </div>
                <OutcomeBadge outcome={outcome} />
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Notes */}
      {game.notes && (
        <Section title="Notes">
          <p
            className={cx(
              cardClass,
              "whitespace-pre-line px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300",
            )}
          >
            {game.notes}
          </p>
        </Section>
      )}

      {/* Actions */}
      <Link href={`/games/${game.id}/edit`} className={buttonClass("outline")}>
        Edit game
      </Link>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-black dark:text-zinc-50">
        {value}
      </span>
    </div>
  );
}

const OUTCOME_TONE: Record<Outcome, BadgeTone> = {
  durak: "durak",
  first_out: "success",
  last_out: "warning",
  none: "neutral",
};

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  if (outcome === "none") return null;
  return <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_LABELS[outcome]}</Badge>;
}
