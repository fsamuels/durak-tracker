# OAuth Provider Setup (Google + Facebook + Discord)

How to configure social login for Durak Tracker. This is the **social login** flow:
Durak Tracker _consumes_ Google/Facebook as identity providers via Supabase Auth.

> ⚠️ **Do not confuse this with Supabase's "OAuth Server" / "OAuth Apps" feature**
> (Authorization Path, `/oauth/consent`, "Dynamic OAuth apps"). That turns your
> project _into_ an OAuth provider for external apps/AI agents — the opposite
> direction — and is **not used** here. Leave it disabled; do not implement an
> `/oauth/consent` page.

## The two-hop redirect (read first)

Two different redirect URLs live in two different places. Swapping them is the most
common cause of `redirect_uri_mismatch` errors.

```
1. User clicks "Continue with Google"
2. Google  → redirects to SUPABASE:  https://wjdubpkmzhsfocvgsjuv.supabase.co/auth/v1/callback
3. Supabase → redirects to OUR APP:  http://localhost:3000/auth/callback  (prod: /auth/callback)
```

| URL                                                         | Owner                                      | Where it goes                                  | Changeable |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- | ---------- |
| `https://wjdubpkmzhsfocvgsjuv.supabase.co/auth/v1/callback` | Supabase (GoTrue)                          | Google/Facebook/Discord console "redirect URI" | ❌ Fixed   |
| `…/auth/callback` (localhost + Vercel)                      | Our app (`src/app/auth/callback/route.ts`) | Supabase "Redirect URLs" allow-list            | ✅ Ours    |

## Part A — Google

1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen:** User type **External**; set app name,
   support email, developer email. Add scopes `userinfo.email`, `userinfo.profile`,
   `openid`. Add your own email under **Test users** (Testing mode needs no
   verification; only listed testers can sign in).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID:**
   - Application type: **Web application**
   - **Authorized redirect URIs:** `https://wjdubpkmzhsfocvgsjuv.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client secret**.
4. **Supabase → Authentication → Sign In / Providers → Google:** enable, paste Client
   ID + Secret, Save.

## Part B — Facebook

More involved (needs a privacy-policy URL to go Live; Development mode only lets
app admins/testers log in). Do Google first, then circle back.

1. [developers.facebook.com](https://developers.facebook.com) → **Create App** →
   use case "Authenticate and request data from users with Facebook Login".
2. Add the **Facebook Login** product.
3. **App Settings → Basic:** copy **App ID** + **App Secret** (set a privacy-policy
   URL here before going Live).
4. **Facebook Login → Settings → Valid OAuth Redirect URIs:**
   `https://wjdubpkmzhsfocvgsjuv.supabase.co/auth/v1/callback`
5. **Supabase → Authentication → Sign In / Providers → Facebook:** enable, paste App
   ID + Secret, Save.
6. Flip the app to **Live** when ready for non-admin users.

## Part C — Discord

Lightweight to set up — no app review, and works for any Discord user immediately
(no testers/Live-mode gate like Facebook).

1. [discord.com/developers/applications](https://discord.com/developers/applications)
   → **New Application** → name it, accept terms.
2. **OAuth2 → General:** copy the **Client ID** and **Client Secret** (click _Reset
   Secret_ if none is shown).
3. **OAuth2 → Redirects → Add Redirect:**
   `https://wjdubpkmzhsfocvgsjuv.supabase.co/auth/v1/callback` → Save.
4. **Supabase → Authentication → Sign In / Providers → Discord:** enable, paste Client
   ID + Secret, Save. (Supabase requests the `identify` + `email` scopes by default.)
5. Add a **Continue with Discord** button in `src/app/login/page.tsx` (same
   `signInWithOAuth({ provider: 'discord' })` pattern as Google).

## Part D — Supabase URL configuration (once)

**Authentication → URL Configuration:**

- **Site URL:** `https://durak-tracker.vercel.app`
- **Redirect URLs** (add both): `http://localhost:3000/**` and
  `https://durak-tracker.vercel.app/**`

This authorizes hop 3 (where Supabase may send users after auth). Our code redirects
to `${origin}/auth/callback`, covered by the wildcards.

## Testing the flow

With the publishable key already in `.env.local`, Google enabled, and URL config set:

```bash
pnpm dev   # http://localhost:3000
```

Expected: unauthenticated → `/login` → "Continue with Google" → Google consent →
back to the app → no group yet → `/onboarding` → create a group → protected home
showing your email + group.

Notes:

- Dev must run on **port 3000** to match the allow-list (`redirectTo` uses
  `window.location.origin`).
- You do **not** need the service_role key or Facebook for this first test — Google
  alone is enough.
