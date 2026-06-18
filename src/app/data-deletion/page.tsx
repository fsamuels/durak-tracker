import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Deletion — Durak Tracker",
  description: "How to delete your Durak Tracker account and associated data.",
};

const CONTACT_EMAIL = "fsamuels@gmail.com";

export default function DataDeletionPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Data Deletion Instructions
        </h1>
      </div>

      <p>
        Durak Tracker stores your account (email and display name) and the
        groups, players, and game results you create. You can request permanent
        deletion of your account and all associated data at any time.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          How to request deletion
        </h2>
        <p>
          Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Durak%20Tracker%20account%20deletion`}
            className="underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          from the address associated with your account, with the subject
          &ldquo;Account deletion&rdquo;. We will permanently delete your
          account and all associated data within 30 days and confirm by email
          once it is done.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-black dark:text-zinc-100">
          What gets deleted
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Your authentication record and login identities.</li>
          <li>Your email address and display name.</li>
          <li>
            Game results, statistics, and player records tied to your account.
          </li>
        </ul>
        <p>
          Game records shared with a group may be retained in anonymized form so
          the group&rsquo;s historical results remain consistent for other
          members; your personal identifiers are removed.
        </p>
      </section>

      <p className="text-xs text-zinc-500">
        See also our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
