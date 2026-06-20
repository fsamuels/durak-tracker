-- Bypasses the GoTrue Auth Admin API (auth.admin.listUsers) which returns
-- HTTP 500 "Database error finding users" on this project configuration.
-- Queries auth.users + auth.identities directly via a SECURITY DEFINER
-- function callable by the service role through PostgREST/RPC.
CREATE OR REPLACE FUNCTION public.admin_list_external_accounts()
RETURNS TABLE (
  user_id      uuid,
  user_email   text,
  provider     text,
  identity_data jsonb,
  linked_at    timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id           AS user_id,
    u.email        AS user_email,
    i.provider,
    i.identity_data,
    i.created_at   AS linked_at,
    i.last_sign_in_at
  FROM auth.users u
  JOIN auth.identities i ON u.id = i.user_id
  WHERE i.provider = ANY(ARRAY['google', 'facebook', 'discord'])
  ORDER BY i.last_sign_in_at DESC NULLS LAST
$$;

-- Restrict to service_role only — anon/authenticated cannot call this.
REVOKE ALL ON FUNCTION public.admin_list_external_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_external_accounts() TO service_role;
