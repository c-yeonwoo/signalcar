-- A profile owner may edit a nickname, but role assignment belongs to the server.
-- RLS limits rows; it does not restrict which columns of an allowed row can change.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (is_admin), UPDATE (is_admin)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;

GRANT INSERT (id, nickname), UPDATE (nickname)
  ON TABLE public.profiles TO authenticated;

-- The helper is used by admin RLS policies. Anonymous callers need no access.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Existing is_admin=true rows are deliberately preserved. Verify their owners
-- against the actual administrator roster before relying on this migration.
