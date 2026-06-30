import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Exchanges the `code` for a session cookie, then sends
 * the user on to `next` (default home). The home page handles the onboarding
 * redirect if the user has no group yet.
 *
 * `next` must be a same-origin relative path: it's attacker-reachable (this
 * route is public), and a value like "@evil.com" turns `${origin}${next}`
 * into a URL whose host is evil.com (userinfo-prefix trick), so anything
 * other than a leading single "/" is rejected.
 */
function isSafeNextPath(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext && isSafeNextPath(rawNext) ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
