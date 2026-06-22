"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  TRUMP_SUIT_SYMBOLS,
  TRUMP_SUIT_NAMES,
  type TrumpSuit,
} from "@/lib/validation/game";

type TrumpEntry = { suit: TrumpSuit; count: number };

// Aurora palette assigned to suits — hearts/diamonds are warm (pink/violet),
// clubs/spades are cool (teal/blue) to loosely echo playing-card conventions.
const SUIT_COLOR: Record<TrumpSuit, string> = {
  hearts: "#ec4899",
  diamonds: "#8b5cf6",
  clubs: "#14b8a6",
  spades: "#3b82f6",
};

export function TrumpDonut({ data }: { data: TrumpEntry[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  return (
    <div className="card-surface flex items-center gap-5 rounded-2xl p-4">
      {/* Donut with total games in the center */}
      <div className="relative h-[112px] w-[112px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="82%"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.suit} fill={SUIT_COLOR[entry.suit]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as TrumpEntry;
                return (
                  <div
                    className="rounded-lg px-2.5 py-1.5 text-xs"
                    style={{
                      background: "rgba(15,27,42,0.92)",
                      color: "#e6f0f5",
                    }}
                  >
                    <span style={{ color: SUIT_COLOR[d.suit] }}>
                      {TRUMP_SUIT_SYMBOLS[d.suit]}
                    </span>{" "}
                    {TRUMP_SUIT_NAMES[d.suit]} — {d.count} (
                    {Math.round((d.count / total) * 100)}%)
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label — absolutely positioned over the donut hole */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-black dark:text-zinc-50">
            {total}
          </span>
          <span className="text-[10px] text-zinc-500">games</span>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-1 flex-col gap-2">
        {data.map((d) => (
          <li key={d.suit} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: SUIT_COLOR[d.suit] }}
            />
            <span className="flex-1 text-zinc-600 dark:text-zinc-400">
              {TRUMP_SUIT_SYMBOLS[d.suit]} {TRUMP_SUIT_NAMES[d.suit]}
            </span>
            <span className="font-medium tabular-nums text-black dark:text-zinc-50">
              {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
