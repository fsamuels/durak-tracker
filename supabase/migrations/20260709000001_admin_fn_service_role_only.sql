-- Durak Tracker — actually restrict admin functions to service_role
--
-- Supabase's default privileges (ALTER DEFAULT PRIVILEGES IN SCHEMA public
-- GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role) mean every
-- new public function is executable by anon + authenticated via direct
-- per-role grants. The admin functions' "REVOKE ALL ... FROM PUBLIC" only
-- removed the (redundant) PUBLIC grant and never touched those, so any
-- signed-in — or anonymous — client could call them over PostgREST RPC and
-- read system-wide data past RLS (verified via has_function_privilege before
-- this migration: authenticated/anon had EXECUTE on all of them).
--
-- Revoke the per-role grants explicitly; service_role keeps EXECUTE from the
-- original migrations. Any future service_role-only function needs this same
-- pair of revokes — FROM PUBLIC alone is not enough.

revoke execute on function admin_list_external_accounts() from anon, authenticated;
revoke execute on function admin_system_stats() from anon, authenticated;
revoke execute on function admin_list_player_claims() from anon, authenticated;
revoke execute on function admin_add_user_to_group(uuid, uuid, text, uuid) from anon, authenticated;
