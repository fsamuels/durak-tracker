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
     * - manifest / icons (added with the PWA later)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
