-- Run only on an isolated DB after migrations; fixtures are rolled back.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.price_signals WHERE evidence_kind = 'legacy_unverified'
  ) THEN
    RAISE EXCEPTION 'expected a legacy seed signal fixture';
  END IF;
END $$;

INSERT INTO public.price_signals
  (trim_id, month, median_deal_price, sample_size, evidence_kind)
VALUES
  ('22222222-2222-2222-2222-222222220001', '2026-09-01', 40000000, 1, 'verified_contract')
ON CONFLICT (trim_id, month) DO UPDATE SET
  median_deal_price = EXCLUDED.median_deal_price,
  sample_size = EXCLUDED.sample_size,
  evidence_kind = EXCLUDED.evidence_kind;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.price_signals WHERE evidence_kind = 'legacy_unverified') THEN
    RAISE EXCEPTION 'anonymous reader sees legacy unverified prices';
  END IF;
  IF (SELECT count(*) FROM public.price_signals WHERE evidence_kind = 'verified_contract') <> 1 THEN
    RAISE EXCEPTION 'anonymous reader cannot see verified contract signal';
  END IF;
END $$;

ROLLBACK;
