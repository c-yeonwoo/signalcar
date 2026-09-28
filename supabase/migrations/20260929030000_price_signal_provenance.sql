-- Existing price_signals have no per-row proof of contract verification.
-- Keep them for audit, but fail closed for consumer reads.
ALTER TABLE public.price_signals
  ADD COLUMN IF NOT EXISTS evidence_kind text NOT NULL DEFAULT 'legacy_unverified';

ALTER TABLE public.price_signals
  DROP CONSTRAINT IF EXISTS price_signals_evidence_kind_check;
ALTER TABLE public.price_signals
  ADD CONSTRAINT price_signals_evidence_kind_check
  CHECK (evidence_kind IN ('legacy_unverified', 'verified_contract'));

DROP POLICY IF EXISTS "price_signals read" ON public.price_signals;
DROP POLICY IF EXISTS "price_signals verified read" ON public.price_signals;
CREATE POLICY "price_signals verified read" ON public.price_signals
  FOR SELECT TO anon, authenticated
  USING (evidence_kind = 'verified_contract');

COMMENT ON COLUMN public.price_signals.evidence_kind IS
  'Legacy rows are not evidence. verified_contract is reserved for server aggregation of receipt_verified deal_reports.';
