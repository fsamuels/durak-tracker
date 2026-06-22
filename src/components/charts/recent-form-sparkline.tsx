"use client";

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { GameResult } from "@/lib/validation/stats";

type FormEntry = { result: GameResult; started_at: string };

// Score: 0 = best (first out), 1 = worst (durak). Monotone interpolation
// keeps the line from overshooting between these bounded values.
const SCORE: Record<GameResult, number> = {
  first_out: 0,
  middle: 0.33,
  last_out: 0.67,
  durak: 1,
};

// Dot fill colour per result — matches the chip strip badges in the page.
const DOT_COLOR: Record<GameResult, string> = {
  first_out: "#10b981",
  middle: "#a1a1aa",
  last_out: "#f59e0b",
  durak: "#ec4899",
};

export function RecentFormSparkline({ data }: { data: FormEntry[] }) {
  if (data.length < 2) return null;

  // Reverse: data comes in newest-first; chart shows oldest→newest left→right.
  const chartData = [...data].reverse().map((r, i) => ({
    i: i + 1,
    score: SCORE[r.result],
    result: r.result,
  }));

  return (
    <div className="card-surface overflow-hidden rounded-2xl px-1 py-2" style={{ height: 72 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 6, bottom: 0, left: -40 }}
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis domain={[0, 1]} hide />
          {/* Mid-line reference so you can see if results are above or below average */}
          <ReferenceLine
            y={0.5}
            stroke="#a1a1aa"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#ec4899"
            strokeWidth={1.5}
            fill="url(#sparkFill)"
            isAnimationActive={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dot={(props: any) => {
              const { cx, cy, payload } = props as {
                cx?: number;
                cy?: number;
                payload: { i: number; result: GameResult };
              };
              if (cx == null || cy == null) return <g key={payload.i} />;
              return (
                <circle
                  key={payload.i}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={DOT_COLOR[payload.result]}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
