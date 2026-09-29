-- Disposable Supabase DB only; all fixtures roll back.
BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.unlock_briefing_with_credit(uuid)') IS NOT NULL
     OR to_regprocedure('public.grant_unlock_on_deal_report()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.deal_reports'::regclass
         AND tgname = 'trg_unlock_on_deal_report' AND NOT tgisinternal
     ) THEN
    RAISE EXCEPTION 'legacy unlock entry point is still present';
  END IF;
  IF has_table_privilege('anon', 'public.report_unlocks', 'SELECT')
     OR has_table_privilege('authenticated', 'public.report_unlocks', 'SELECT')
     OR has_table_privilege('authenticated', 'public.report_unlocks', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.report_unlocks', 'SELECT') THEN
    RAISE EXCEPTION 'legacy unlock table grants are unsafe';
  END IF;
END $$;

INSERT INTO auth.users (id, email)
VALUES ('a0000000-0000-4000-8000-000000000017', 'owner@sc017.invalid');
INSERT INTO public.report_unlocks (user_id, trim_id, source) VALUES
  ('a0000000-0000-4000-8000-000000000017',
   '22222222-2222-2222-2222-222222220001', 'deal_report'),
  ('a0000000-0000-4000-8000-000000000017',
   '22222222-2222-2222-2222-222222220003', 'purchase');
INSERT INTO public.deal_reports
  (trim_id, user_id, contract_price, contract_month, source, verification_status)
VALUES
  ('22222222-2222-2222-2222-222222220002',
   'a0000000-0000-4000-8000-000000000017',
   45000000, '2026-09-01', 'manual', 'receipt_verified');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.report_unlocks
      WHERE user_id = 'a0000000-0000-4000-8000-000000000017') <> 2 THEN
    RAISE EXCEPTION 'verified report still creates a legacy unlock or old audit row was removed';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000017', true);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM 1 FROM public.report_unlocks LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'owner can still read a legacy unlock'; END IF;
END $$;

ROLLBACK;
