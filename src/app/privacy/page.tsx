import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Durak Tracker",
  description: "How Durak Tracker collects, uses, and protects your data.",
};

const CONTACT_EMAIL = "fsamuels@gmail.com";
const LAST_UPDATED = "June 17, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        Durak Tracker (&ldquo;the app&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) is a personal, non-commercial tool for recording the
        results of Durak card games among groups of friends. This policy
        explains what data we collect, why, and how you can control it.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          Information we collect
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            <strong>Account information.</strong> When you sign in with Google,
            Facebook, or Discord, we receive your email address and basic
            profile information (such as your name) from that provider solely to
            create and identify your account.
          </li>
          <li>
            <strong>Profile data.</strong> A display name you choose, shown to
            other members of your groups.
          </li>
          <li>
            <strong>App content.</strong> The groups, players, and game results
            you create within the app.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect payment information, post anything
          to your social accounts, or access your contacts or friends list.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          How we use your information
        </h2>
        <p>
          We use your information only to authenticate you, operate the
          app&rsquo;s features (tracking games and showing statistics within
          your groups), and maintain the security of your account. We do not
          sell your data, share it with advertisers, or use it for any purpose
          unrelated to running the app.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          How your data is stored
        </h2>
        <p>
          Authentication and application data are stored using{" "}
          <a
            href="https://supabase.com/privacy"
            className="underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase
          </a>
          , our database and authentication provider, and the app is hosted on{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            className="underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          . Data is transmitted over encrypted (HTTPS) connections.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          Deleting your data
        </h2>
        <p>
          You can request deletion of your account and all associated data at
          any time. See our{" "}
          <Link href="/data-deletion" className="underline underline-offset-4">
            data deletion instructions
          </Link>{" "}
          for details.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          Contact
        </h2>
        <p>
          Questions about this policy or your data? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
