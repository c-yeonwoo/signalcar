-- Disposable Supabase DB only. Existing email rows are retained but hidden from other users.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'owner@sc018.invalid'),
  ('f0000000-0000-4000-8000-000000000002', 'other@sc018.invalid');
INSERT INTO public.digest_signups (email, user_id) VALUES
  ('guest@sc018.invalid', NULL),
  ('owner@sc018.invalid', 'f0000000-0000-4000-8000-000000000001'),
  ('other@sc018.invalid', 'f0000000-0000-4000-8000-000000000002');

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.digest_signups', 'INSERT')
     OR has_table_privilege('authenticated', 'public.digest_signups', 'INSERT')
     OR has_table_privilege('anon', 'public.pro_signups', 'INSERT')
     OR has_table_privilege('authenticated', 'public.pro_signups', 'INSERT') THEN
    RAISE EXCEPTION 'paused marketing forms still accept public inserts';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.digest_signups) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.digest_signups WHERE email = 'owner@sc018.invalid') THEN
    RAISE EXCEPTION 'an account could read guest or another account email';
  END IF;
END $$;

ROLLBACK;
