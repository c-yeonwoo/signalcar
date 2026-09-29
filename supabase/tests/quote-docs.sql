-- Run only against an isolated Supabase DB after all migrations. ROLLBACK preserves fixtures.
BEGIN;

DO $$
BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'quote-docs') IS DISTINCT FROM false
     OR (SELECT file_size_limit FROM storage.buckets WHERE id = 'quote-docs') IS DISTINCT FROM 5242880
     OR to_regprocedure('public.unlock_briefing_with_credit(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'quote-docs bucket must be private and limited to 5 MiB';
  END IF;
END $$;

INSERT INTO auth.users (id, email) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'owner@sc014.invalid'),
  ('d0000000-0000-4000-8000-000000000002', 'other@sc014.invalid');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-000000000001', true);

INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('quote-docs', 'd0000000-0000-4000-8000-000000000001/redacted.png', 'd0000000-0000-4000-8000-000000000001');

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
      ('quote-docs', 'd0000000-0000-4000-8000-000000000002/wrong.png', 'd0000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'user uploaded to another folder'; END IF;
END $$;

INSERT INTO public.quote_diagnoses (user_id, doc_path) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001/redacted.png');

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.quote_diagnoses (user_id, doc_path) VALUES
      ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001/nonexistent.png');
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'diagnosis accepted a missing object'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-000000000002', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'quote-docs')
     OR EXISTS (SELECT 1 FROM public.quote_diagnoses) THEN
    RAISE EXCEPTION 'other user can read private quote data';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-000000000001', true);
DELETE FROM public.quote_diagnoses WHERE user_id = 'd0000000-0000-4000-8000-000000000001';

INSERT INTO public.deal_reports (trim_id, user_id, contract_price, contract_month, source)
VALUES (
  '22222222-2222-2222-2222-222222220001',
  'd0000000-0000-4000-8000-000000000001',
  40000000, '2026-09-01', 'manual'
);

RESET ROLE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.report_unlocks
             WHERE user_id = 'd0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'unverified report granted an unlock';
  END IF;
END $$;

UPDATE public.deal_reports SET verification_status = 'receipt_verified'
WHERE user_id = 'd0000000-0000-4000-8000-000000000001';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.report_unlocks
             WHERE user_id = 'd0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'verified report created a legacy unlock without a ledger';
  END IF;
END $$;

ROLLBACK;
