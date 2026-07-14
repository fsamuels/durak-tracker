import Link from "next/link";

import { Logo } from "@/components/logo";
import { getClaimDetails } from "@/lib/data/claims";
import { createClient } from "@/lib/supabase/server";
import { claimTokenSchema } from "@/lib/validation/claim";

import { ClaimButton, ClaimSignInButton } from "./claim-client";

const GUID_PATTERN =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

/**
 * Claim landing page. Public (see PUBLIC_PATHS) so an invitee can open the link
 * while signed out, see who they'd be claiming, then sign in. The actual
 * redemption is gated server-side by the claim_player RPC.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // The Web Share API hands targets the message text + URL together, so a
  // shared/copied link can arrive with trailing whitespace or punctuation
  // appended to the token. Pull the GUID out before validating so a valid link
  // isn't rejected over stray characters.
  const normalizedToken = token.trim().match(GUID_PATTERN)?.[0] ?? token;
  const parsed = claimTokenSchema.safeParse(normalizedToken);

  if (!parsed.success) {
    return (
      <ClaimShell title="Invalid link">
        <p className="text-zinc-600 dark:text-zinc-400">
          This claim link doesn&apos;t look right. Ask whoever shared it to send
          a new one.
        </p>
        <HomeLink />
      </ClaimShell>
    );
  }

  const details = await getClaimDetails(parsed.data);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (details.status === "not_found") {
    return (
      <ClaimShell title="Link not found">
        <p className="text-zinc-600 dark:text-zinc-400">
          This claim link is invalid or has been removed.
        </p>
        <HomeLink />
      </ClaimShell>
    );
  }

  if (details.status === "expired") {
    return (
      <ClaimShell title="Link expired">
        <p className="text-zinc-600 dark:text-zinc-400">
          This link to claim <Name name={details.playerName} /> in{" "}
          <Name name={details.groupName} /> has expired. Ask a group member for
          a fresh link.
        </p>
        <HomeLink />
      </ClaimShell>
    );
  }

  if (details.status === "claimed") {
    return (
      <ClaimShell title="Already claimed">
        <p className="text-zinc-600 dark:text-zinc-400">
          <Name name={details.playerName} /> has already been claimed. If that
          wasn&apos;t you, ask a group member for help.
        </p>
        <HomeLink />
      </ClaimShell>
    );
  }

  // status === "valid"
  return (
    <ClaimShell title="Claim your player">
      <p className="text-zinc-600 dark:text-zinc-400">
        You&apos;ve been invited to claim <Name name={details.playerName} /> in{" "}
        <Name name={details.groupName} />. Claiming links this player to your
        account and adds you to the group.
      </p>

      {!user ? (
        <ClaimSignInButton token={parsed.data} />
      ) : details.alreadyMember ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber-600 dark:text-amber-500">
            You&apos;re already a member of {details.groupName}, so you
            can&apos;t claim another player here.
          </p>
          <HomeLink />
        </div>
      ) : (
        <ClaimButton token={parsed.data} />
      )}
    </ClaimShell>
  );
}

function ClaimShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="card-surface flex w-full max-w-sm flex-col gap-5 rounded-2xl p-7">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <h1 className="text-brand-gradient text-2xl font-bold tracking-tight">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function Name({ name }: { name: string | null }) {
  return <span className="font-semibold">{name ?? "this player"}</span>;
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="text-center text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
    >
      Go to Durak Tracker →
    </Link>
  );
}
