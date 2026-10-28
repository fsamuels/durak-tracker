"use client";

import { useTheme } from "next-themes";

import { cardClass, cx, segmentClass } from "@/lib/ui";

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
      role="group"
      aria-label="Theme"
      className={cx(cardClass, "flex gap-1 p-1")}
      suppressHydrationWarning
    >
      {THEMES.map(({ value, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            suppressHydrationWarning
            className={segmentClass(active)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
