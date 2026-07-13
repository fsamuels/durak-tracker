import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the "middleware" file convention to "proxy".
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon and common static files
     * - the PWA manifest, service worker, and icons. The browser fetches the
     *   manifest WITHOUT cookies (credential-less per spec), so an auth
     *   redirect here breaks installability even for signed-in users; a
     *   redirect on sw.js makes service-worker registration fail outright.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
