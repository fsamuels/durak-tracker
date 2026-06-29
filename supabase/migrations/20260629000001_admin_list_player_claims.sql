-- Durak Tracker — admin visibility into account claim links
-- The /admin area shows system-wide claim links (every group), but the
-- player_claims RLS only lets a group member see their own group's rows. Mirror
-- the admin_list_external_accounts pattern: a SECURITY DEFINER function callable
-- by the service role only, joining the human-readable names + the minter/claimer
-- emails so the admin page can render status without further lookups.
--
-- The token (a live single-use credential for unredeemed links) is intentionally
-- NOT returned — the admin view only needs status, not the secret.
CREATE OR REPLACE FUNCTION public.admin_list_player_claims()
RETURNS TABLE (
  claim_id        uuid,
  group_id        uuid,
  group_name      text,
  player_id       uuid,
  player_name     text,
  player_linked   boolean,
  created_by_email text,
  created_at      timestamptz,
  expires_at      timestamptz,
  claimed_by_email text,
  claimed_at      timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    pc.token                  AS claim_id,
    pc.group_id,
    g.name                    AS group_name,
    pc.player_id,
    p.display_name            AS player_name,
    p.auth_user_id IS NOT NULL AS player_linked,
    creator.email             AS created_by_email,
    pc.created_at,
    pc.expires_at,
    claimer.email             AS claimed_by_email,
    pc.claimed_at
  FROM player_claims pc
  JOIN groups g            ON g.id = pc.group_id
  JOIN players p           ON p.id = pc.player_id
  LEFT JOIN auth.users creator ON creator.id = pc.created_by
  LEFT JOIN auth.users claimer ON claimer.id = pc.claimed_by
  ORDER BY pc.created_at DESC
$$;

-- Restrict to service_role only — anon/authenticated cannot call this.
REVOKE ALL ON FUNCTION public.admin_list_player_claims() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_player_claims() TO service_role;
