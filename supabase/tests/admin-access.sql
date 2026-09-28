-- Run against a disposable Supabase database with all migrations applied:
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/admin-access.sql
BEGIN;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     OR has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'INSERT')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'nickname', 'UPDATE')
     OR has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'profile/admin grants do not match the intended contract';
  END IF;
END $$;

INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'normal@sc009.invalid'),
  ('c0000000-0000-4000-8000-000000000002', 'admin@sc009.invalid'),
  ('c0000000-0000-4000-8000-000000000003', 'new@sc009.invalid');

UPDATE public.profiles SET is_admin = true
WHERE id = 'c0000000-0000-4000-8000-000000000002';
DELETE FROM public.profiles
WHERE id = 'c0000000-0000-4000-8000-000000000003';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000001', true);

DO $$
DECLARE
  changed integer;
  blocked boolean := false;
BEGIN
  IF public.is_admin() THEN
    RAISE EXCEPTION 'ordinary user passed is_admin()';
  END IF;

  BEGIN
    UPDATE public.profiles SET is_admin = true
    WHERE id = 'c0000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'ordinary user changed is_admin';
  END IF;

  UPDATE public.profiles SET nickname = 'safe edit'
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'ordinary user cannot update their own nickname';
  END IF;

  UPDATE public.brands SET name = name;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN
    RAISE EXCEPTION 'ordinary user changed admin data';
  END IF;
END $$;

DO $$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, nickname, is_admin)
    VALUES ('c0000000-0000-4000-8000-000000000003', 'new', true);
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'ordinary user inserted an admin profile';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'c0000000-0000-4000-8000-000000000002', true);
DO $$
DECLARE
  changed integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'server-assigned admin was rejected';
  END IF;

  UPDATE public.brands SET name = name WHERE id = (SELECT id FROM public.brands LIMIT 1);
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'server-assigned admin cannot update admin data';
  END IF;
END $$;

ROLLBACK;
