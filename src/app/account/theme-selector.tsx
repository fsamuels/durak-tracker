"use client";

import { useTheme } from "next-themes";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  // theme is undefined before client mount; skip active styling until hydrated
  const mounted = theme !== undefined;

  return (
    <div
      className="card-surface flex overflow-hidden rounded-2xl"
      suppressHydrationWarning
    >
      {THEMES.map(({ value, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            suppressHydrationWarning
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              active
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
