-- Disposable Supabase DB only; fixture and assertions roll back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'reader@sc011-promo.invalid'),
  ('b1000000-0000-4000-8000-000000000002', 'admin@sc011-promo.invalid');
UPDATE public.profiles SET is_admin = true
WHERE id = 'b1000000-0000-4000-8000-000000000002';
INSERT INTO public.official_promotions (trim_id, month, discount_type, amount, source_url)
VALUES ('22222222-2222-2222-2222-222222220001', current_date, 'cash', 1000000,
  'https://www.kia.com/kr/buy/special-offers');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ingest_loop_config
    WHERE job_id = 'promo-etl' AND enabled) THEN
    RAISE EXCEPTION 'unreviewed promotion import remains scheduled';
  END IF;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.official_promotions) THEN
    RAISE EXCEPTION 'anonymous reader can see unreviewed promotions';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.official_promotions) THEN
    RAISE EXCEPTION 'ordinary account can see unreviewed promotions';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.official_promotions WHERE amount = 1000000) THEN
    RAISE EXCEPTION 'admin lost access to audit promotion rows';
  END IF;
END $$;

ROLLBACK;
