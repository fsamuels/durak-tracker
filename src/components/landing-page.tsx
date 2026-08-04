import Link from "next/link";

import { Logo } from "@/components/logo";
import { OAuthButtons } from "@/components/oauth-buttons";

const SITE_URL = "https://durak-tracker.vercel.app";

// SoftwareApplication structured data so search engines can surface a rich
// result (name, category, free price) for the app itself, not just a link.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Durak Tracker",
  url: SITE_URL,
  description:
    "Track results of Durak card games among groups of friends — who was the durak, the trump suit, the players, and computed stats.",
  applicationCategory: "GameApplication",
  operatingSystem: "Any (installable web app)",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const FEATURES = [
  {
    icon: "🃏",
    title: "Log every game",
    body: "Who was the durak, the trump suit, and who played — logged in seconds from your phone.",
  },
  {
    icon: "📊",
    title: "Group & player stats",
    body: "Durak rate, win streaks, head-to-head records, and top trump suits, computed automatically.",
  },
  {
    icon: "👥",
    title: "Multiple groups",
    body: "Track a work game, a family game, and a friend group separately — switch anytime.",
  },
  {
    icon: "📱",
    title: "Installable app",
    body: "Add it to your home screen for a fast, app-like experience — no App Store required.",
  },
];

const STEPS = [
  {
    title: "Create a group",
    body: "Sign in and add the players in your regular game.",
  },
  {
    title: "Log the result",
    body: "After each hand, record the durak, the trump suit, and who played.",
  },
  {
    title: "See the stats",
    body: "Track durak rate, streaks, and bragging rights over time.",
  },
];

/**
 * Public marketing page shown at `/` to signed-out visitors — the SEO
 * landing page for organic/social traffic. Signed-in users never see this;
 * `src/app/page.tsx` renders the dashboard for them instead.
 */
export function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-12 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="flex flex-col items-center gap-4 text-center">
        <Logo size={56} />
        <h1 className="text-brand-gradient text-4xl font-bold tracking-tight">
          Durak Tracker
        </h1>
        <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
          The free way to track who&rsquo;s the durak (loser) in your card game
          group — every game, every group, every stat.
        </p>
        <OAuthButtons />
        <p className="text-xs text-zinc-500">
          Free forever. No ads. Your data stays private to your group.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-sm font-medium text-zinc-500">
          How it works
        </h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="card-surface flex items-start gap-3 rounded-2xl px-4 py-3"
            >
              <span
                aria-hidden
                className="text-brand-gradient flex size-6 shrink-0 items-center justify-center text-lg font-bold"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-black dark:text-zinc-50">
                  {step.title}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {step.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-sm font-medium text-zinc-500">
          What you get
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card-surface flex flex-col gap-1 rounded-2xl px-4 py-3"
            >
              <span aria-hidden className="text-2xl">
                {feature.icon}
              </span>
              <span className="font-semibold text-black dark:text-zinc-50">
                {feature.title}
              </span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {feature.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface flex flex-col gap-2 rounded-2xl px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          What is Durak?
        </h2>
        <p>
          <a
            href="https://en.wikipedia.org/wiki/Durak"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-black underline underline-offset-4 dark:text-zinc-50"
          >
            Durak
          </a>{" "}
          (Russian for &ldquo;fool&rdquo;) is a popular card game played across
          Eastern Europe where the last player still holding cards loses —
          becoming &ldquo;the durak.&rdquo; Durak Tracker keeps score across
          sessions so your group can settle who&rsquo;s really the best (and
          who&rsquo;s really the durak).
        </p>
      </section>

      <Link
        href="/login"
        className="btn-brand flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold"
      >
        Get started — it&rsquo;s free →
      </Link>
    </main>
  );
}
