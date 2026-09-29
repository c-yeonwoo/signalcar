-- Disposable Supabase DB only. Fixtures and review actions roll back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'reader@sc011.invalid'),
  ('b0000000-0000-4000-8000-000000000002', 'admin@sc011.invalid');
UPDATE public.profiles SET is_admin = true
WHERE id = 'b0000000-0000-4000-8000-000000000002';

DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.trim_msrp_evidence', 'status', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.trim_msrp_evidence', 'reviewed_at', 'UPDATE')
     OR has_table_privilege('anon', 'public.trim_msrp_evidence', 'INSERT')
     OR has_table_privilege('anon', 'public.trim_msrp_evidence', 'SELECT')
     OR EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'current_trim_msrp'
         AND column_name IN ('created_by', 'reviewed_by')) THEN
    RAISE EXCEPTION 'consumer can write review status';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
DO $$
DECLARE blocked boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.trim_msrp_evidence) THEN
    RAISE EXCEPTION 'ordinary user can read draft price evidence';
  END IF;
  BEGIN
    INSERT INTO public.trim_msrp_evidence
      (trim_id, amount_won, source_url, source_locator, valid_from)
    VALUES ('22222222-2222-2222-2222-222222220001', 39000000,
      'https://www.hyundai.com/test-price.pdf', '가격표 3쪽 트림 행', current_date - 1);
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'ordinary user inserted price evidence'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
INSERT INTO public.trim_msrp_evidence
  (trim_id, amount_won, source_url, source_locator, valid_from)
VALUES ('22222222-2222-2222-2222-222222220001', 39000000,
  'https://www.hyundai.com/test-price.pdf', '가격표 3쪽 트림 행', current_date - 1);

DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.trim_msrp_evidence SET status = 'verified'
    WHERE source_url = 'https://www.hyundai.com/test-price.pdf';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'admin bypassed publish review function'; END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.current_trim_msrp) THEN
    RAISE EXCEPTION 'draft MSRP is public';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', true);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.review_trim_msrp_evidence(
      (SELECT id FROM public.trim_msrp_evidence WHERE source_url = 'https://www.hyundai.com/test-price.pdf'),
      'publish');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'ordinary user published MSRP'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  PERFORM public.review_trim_msrp_evidence(
    (SELECT id FROM public.trim_msrp_evidence WHERE source_url = 'https://www.hyundai.com/test-price.pdf'),
    'publish');
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.current_trim_msrp) <> 1
     OR (SELECT amount_won FROM public.current_trim_msrp LIMIT 1) <> 39000000 THEN
    RAISE EXCEPTION 'reviewed MSRP is not readable';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
INSERT INTO public.trim_msrp_evidence
  (trim_id, amount_won, source_url, source_locator, valid_from)
VALUES ('22222222-2222-2222-2222-222222220001', 39500000,
  'https://www.hyundai.com/test-price-v2.pdf', '가격표 4쪽 트림 행', current_date - 1);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.review_trim_msrp_evidence(
      (SELECT id FROM public.trim_msrp_evidence WHERE source_url = 'https://www.hyundai.com/test-price-v2.pdf'),
      'publish');
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'two verified MSRP facts for one trim'; END IF;
END $$;
DO $$ BEGIN
  PERFORM public.review_trim_msrp_evidence(
    (SELECT id FROM public.trim_msrp_evidence WHERE source_url = 'https://www.hyundai.com/test-price.pdf'),
    'withdraw');
  PERFORM public.review_trim_msrp_evidence(
    (SELECT id FROM public.trim_msrp_evidence WHERE source_url = 'https://www.hyundai.com/test-price-v2.pdf'),
    'publish');
END $$;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.trim_msrp_review_events) <> 3 THEN
    RAISE EXCEPTION 'review transitions were not audited';
  END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT amount_won FROM public.current_trim_msrp LIMIT 1) <> 39500000 THEN
    RAISE EXCEPTION 'withdrawn value remained public';
  END IF;
END $$;

RESET ROLE;
UPDATE public.trim_msrp_evidence SET review_due_at = now() - interval '1 second'
WHERE source_url = 'https://www.hyundai.com/test-price-v2.pdf';
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.current_trim_msrp) THEN
    RAISE EXCEPTION 'expired review remained public';
  END IF;
END $$;

ROLLBACK;
