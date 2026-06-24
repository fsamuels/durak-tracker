import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getGameDetail } from "@/lib/data/games";
import { getCurrentGroup } from "@/lib/data/groups";
import { formatInTz } from "@/lib/time";
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

  const game = await getGameDetail(group.id, parsedId.data);
  if (!game) notFound();

  const participants = game.game_players ?? [];
  const durak = participants.find((p) => p.is_durak);
  const trump = game.trump_suit
    ? TRUMP_SUIT_LABELS[game.trump_suit as TrumpSuit]
    : null;
  const durationSeconds =
    game.ended_at
      ? (new Date(game.ended_at).getTime() -
          new Date(game.started_at).getTime()) /
        1000
      : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/games"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Game history
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {formatInTz(game.started_at, group.timezone)}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Game in <span className="font-medium">{group.name}</span>
        </p>
      </div>

      {/* Details */}
      <section className="card-surface flex flex-col gap-3 rounded-2xl px-4 py-4">
        <Row label="Started" value={formatInTz(game.started_at, group.timezone)} />
        {game.ended_at && (
          <Row label="Ended" value={formatInTz(game.ended_at, group.timezone)} />
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
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500">Players</h2>
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
                className="card-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
              >
                <Link
                  href={`/stats/players/${gp.player_id}`}
                  className="font-medium text-black underline-offset-4 hover:underline dark:text-zinc-50"
                >
                  {name}
                </Link>
                <OutcomeBadge outcome={outcome} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Notes */}
      {game.notes && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">Notes</h2>
          <p className="card-surface rounded-2xl px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
            {game.notes}
          </p>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Link
          href={`/games/${game.id}/edit`}
          className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          Edit game
        </Link>
        <Link
          href={`/games/new?from=${game.id}`}
          className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          ↻ Play again
        </Link>
      </div>

      {durak && (
        <div className="badge-durak flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-medium">
          <span aria-hidden>🃏</span> Durak: {durak.players?.display_name}
        </div>
      )}
    </main>
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

const OUTCOME_STYLE: Record<Outcome, string> = {
  durak: "badge-durak",
  first_out: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  last_out: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  none: "bg-black/5 text-zinc-500 dark:bg-white/10",
};

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  if (outcome === "none") return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_STYLE[outcome]}`}
    >
      {OUTCOME_LABELS[outcome]}
    </span>
  );
}
