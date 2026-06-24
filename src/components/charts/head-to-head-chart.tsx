"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HeadToHead } from "@/lib/validation/stats";

function truncate(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function HeadToHeadChart({
  data,
  playerName,
}: {
  data: HeadToHead;
  playerName: string;
}) {
  // Reserve at least a third of the chart's width for the player names so they
  // aren't truncated to a few characters. ResponsiveContainer sizes the chart
  // to the container, so we measure the container and derive the label width.
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelWidth, setLabelWidth] = useState(96);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setLabelWidth(Math.round(el.clientWidth / 3));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (data.length === 0) return null;

  // Roughly 7px per character at the 12px tick font; keep a small left inset.
  const maxNameChars = Math.max(11, Math.floor((labelWidth - 8) / 7));

  const chartData = data.map((o) => ({
    name: truncate(o.display_name, maxNameChars),
    fullName: o.display_name,
    mine: o.my_durak_count,
    theirs: o.opponent_durak_count,
    // games where neither this player nor the opponent was the durak
    neither: Math.max(
      0,
      o.games_together - o.my_durak_count - o.opponent_durak_count,
    ),
    games: o.games_together,
  }));

  // 34px per row + 24px for the XAxis tick labels at the bottom
  const chartHeight = data.length * 34 + 28;

  return (
    <div
      ref={containerRef}
      className="card-surface overflow-hidden rounded-2xl px-2 pt-2 pb-1"
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="30%"
          stackOffset="expand"
        >
          {/* X axis shows 0–100% labels */}
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 10, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={labelWidth}
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof chartData)[number];
              const pct = (n: number) =>
                d.games > 0 ? `${Math.round((n / d.games) * 100)}%` : "—";
              return (
                <div
                  className="rounded-lg px-2.5 py-1.5 text-xs"
                  style={{
                    background: "rgba(15,27,42,0.92)",
                    color: "#e6f0f5",
                  }}
                >
                  <p className="mb-1 font-medium">
                    vs {d.fullName} · {d.games} game
                    {d.games === 1 ? "" : "s"}
                  </p>
                  <p>
                    <span style={{ color: "#ec4899" }}>
                      {playerName}: {d.mine} durak ({pct(d.mine)})
                    </span>
                  </p>
                  <p>
                    <span style={{ color: "#3b82f6" }}>
                      {d.fullName}: {d.theirs} durak ({pct(d.theirs)})
                    </span>
                  </p>
                </div>
              );
            }}
          />
          {/* My durak share — pink */}
          <Bar
            dataKey="mine"
            stackId="h2h"
            fill="#ec4899"
            fillOpacity={0.82}
            isAnimationActive={false}
          />
          {/* Opponent's durak share — blue */}
          <Bar
            dataKey="theirs"
            stackId="h2h"
            fill="#3b82f6"
            fillOpacity={0.82}
            isAnimationActive={false}
          />
          {/* Games where neither was durak — neutral fill */}
          <Bar
            dataKey="neither"
            stackId="h2h"
            fill="#a1a1aa"
            fillOpacity={0.25}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
