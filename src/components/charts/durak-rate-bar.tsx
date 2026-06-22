"use client";

import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { durakRate, rate, type GroupPlayerLine } from "@/lib/validation/stats";

function truncate(name: string, max = 11): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function DurakRateBar({ players }: { players: GroupPlayerLine[] }) {
  if (players.length === 0) return null;

  const data = players.map((p) => ({
    name: truncate(p.display_name),
    fullName: p.display_name,
    rateVal: durakRate(p),
    rateLabel: rate(p.durak_count, p.games_played),
    games: p.games_played,
  }));

  // 34px per row + 8px top + 8px bottom padding
  const chartHeight = players.length * 34 + 16;

  return (
    <div
      className="card-surface overflow-hidden rounded-2xl px-2 py-2"
      style={{ height: chartHeight }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
          barCategoryGap="30%"
        >
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={76}
            tick={{ fontSize: 12, fill: "#71717a" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <div
                  className="rounded-lg px-2.5 py-1.5 text-xs"
                  style={{
                    background: "rgba(15,27,42,0.92)",
                    color: "#e6f0f5",
                  }}
                >
                  <span className="font-medium">{d.fullName}</span> —{" "}
                  {d.rateLabel} durak rate ({d.games} game
                  {d.games === 1 ? "" : "s"})
                </div>
              );
            }}
          />
          <Bar
            dataKey="rateVal"
            fill="#ec4899"
            fillOpacity={0.82}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="rateLabel"
              position="right"
              style={{ fontSize: 11, fill: "#71717a" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
