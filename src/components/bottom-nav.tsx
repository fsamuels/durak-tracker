"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** This tab's stop on the brand gradient, used for its active state. */
  color: string;
  /** Extra path prefixes that should also light this tab up. */
  match?: (path: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Home",
    icon: <HomeIcon />,
    color: "var(--brand-from)",
    match: (p) => p === "/",
  },
  {
    href: "/games",
    label: "Games",
    icon: <GamesIcon />,
    color: "var(--brand-via)",
    match: (p) => p.startsWith("/games"),
  },
  {
    href: "/stats",
    label: "Stats",
    icon: <StatsIcon />,
    color: "var(--brand-via2)",
    match: (p) => p.startsWith("/stats"),
  },
  {
    href: "/players",
    label: "Players",
    icon: <PlayersIcon />,
    color: "var(--brand-to)",
    match: (p) => p.startsWith("/players"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-white/10"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch">
        {TABS.map((tab) => {
          const active = tab.match
            ? tab.match(pathname)
            : pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                style={{ "--tab-color": tab.color } as React.CSSProperties}
                className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active
                    ? "nav-tab-active font-semibold"
                    : "font-medium text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                <TabBody icon={tab.icon} label={tab.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A tab's icon + label. Rendered inside the tab's `<Link>` so `useLinkStatus`
 * can see that link's navigation: while a tapped tab's page is still loading
 * it lights up in its own color (`.nav-tab-pending`), so the tap registers
 * immediately instead of waiting for the server.
 */
function TabBody({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`flex flex-col items-center gap-1 ${
        pending && !active ? "nav-tab-pending" : ""
      }`}
    >
      <span aria-hidden className="contents">
        {icon}
      </span>
      {label}
    </span>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function GamesIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="13" height="16" rx="2" />
      <path d="m16 7 4 1.2a1 1 0 0 1 .7 1.2l-2.6 9.3" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-6" />
      <path d="M22 20H2" />
    </svg>
  );
}

function PlayersIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17.5 14.3A5.5 5.5 0 0 1 20.5 19" />
    </svg>
  );
}
