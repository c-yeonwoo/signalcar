-- MSRP evidence is separate from legacy trims.base_price, which has no provenance.
-- A verified fact expires from consumer reads after 30 days without re-review.
CREATE TABLE public.trim_msrp_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE RESTRICT,
  amount_won bigint NOT NULL CHECK (amount_won > 0),
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  source_locator text NOT NULL CHECK (length(btrim(source_locator)) BETWEEN 3 AND 300),
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  captured_at timestamptz NOT NULL DEFAULT now(),
  valid_from date NOT NULL,
  valid_to date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'verified', 'withdrawn')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_due_at timestamptz,
  withdrawn_at timestamptz,
  CONSTRAINT trim_msrp_valid_window CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT trim_msrp_review_state CHECK (
    (status = 'draft' AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND review_due_at IS NULL AND withdrawn_at IS NULL)
    OR (status = 'verified' AND reviewed_at IS NOT NULL
      AND review_due_at IS NOT NULL AND withdrawn_at IS NULL)
    OR (status = 'withdrawn' AND reviewed_at IS NOT NULL AND withdrawn_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX trim_msrp_one_verified_per_trim
  ON public.trim_msrp_evidence(trim_id) WHERE status = 'verified';
CREATE INDEX trim_msrp_evidence_trim_created
  ON public.trim_msrp_evidence(trim_id, created_at DESC);

ALTER TABLE public.trim_msrp_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trim_msrp_evidence FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.trim_msrp_evidence TO authenticated;
GRANT INSERT (trim_id, amount_won, source_url, source_locator, source_document_id,
  captured_at, valid_from, valid_to) ON public.trim_msrp_evidence TO authenticated;
GRANT UPDATE (amount_won, source_url, source_locator, source_document_id,
  captured_at, valid_from, valid_to) ON public.trim_msrp_evidence TO authenticated;
GRANT ALL ON public.trim_msrp_evidence TO service_role;

CREATE POLICY "trim msrp admin read" ON public.trim_msrp_evidence
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "trim msrp admin draft insert" ON public.trim_msrp_evidence
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() AND status = 'draft' AND created_by = auth.uid()
  );
CREATE POLICY "trim msrp admin draft update" ON public.trim_msrp_evidence
  FOR UPDATE TO authenticated USING (public.is_admin() AND status = 'draft')
  WITH CHECK (public.is_admin() AND status = 'draft');

-- Public access is limited to reviewed fields; reviewer/account IDs remain private.
CREATE VIEW public.current_trim_msrp AS
  SELECT id, trim_id, amount_won, source_url, source_locator, captured_at,
    valid_from, valid_to, reviewed_at, review_due_at
  FROM public.trim_msrp_evidence
  WHERE status = 'verified'
    AND valid_from <= (timezone('Asia/Seoul', now()))::date
    AND (valid_to IS NULL OR valid_to >= (timezone('Asia/Seoul', now()))::date)
    AND review_due_at > now();
REVOKE ALL ON public.current_trim_msrp FROM PUBLIC;
GRANT SELECT ON public.current_trim_msrp TO anon, authenticated;

CREATE TABLE public.trim_msrp_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.trim_msrp_evidence(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('publish', 'withdraw')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trim_msrp_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trim_msrp_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.trim_msrp_review_events TO authenticated;
GRANT ALL ON public.trim_msrp_review_events TO service_role;
CREATE POLICY "trim msrp review events admin read" ON public.trim_msrp_review_events
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE FUNCTION public.review_trim_msrp_evidence(p_evidence_id uuid, p_action text)
RETURNS public.trim_msrp_evidence
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  fact public.trim_msrp_evidence;
BEGIN
  IF actor IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'catalog reviewer access required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO fact FROM public.trim_msrp_evidence
    WHERE id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'price evidence not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'publish' AND fact.status = 'draft' THEN
    IF fact.valid_from > (timezone('Asia/Seoul', now()))::date
       OR (fact.valid_to IS NOT NULL AND fact.valid_to < (timezone('Asia/Seoul', now()))::date)
       OR (fact.source_document_id IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.source_documents
         WHERE id = fact.source_document_id AND url = fact.source_url
       )) THEN
      RAISE EXCEPTION 'price evidence source or effective date is invalid'
        USING ERRCODE = '22023';
    END IF;
    UPDATE public.trim_msrp_evidence SET
      status = 'verified', reviewed_by = actor, reviewed_at = now(),
      review_due_at = now() + interval '30 days'
    WHERE id = p_evidence_id RETURNING * INTO fact;
  ELSIF p_action = 'withdraw' AND fact.status = 'verified' THEN
    UPDATE public.trim_msrp_evidence SET
      status = 'withdrawn', withdrawn_at = now(), review_due_at = NULL
    WHERE id = p_evidence_id RETURNING * INTO fact;
  ELSE
    RAISE EXCEPTION 'invalid price evidence transition' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.trim_msrp_review_events (evidence_id, actor_id, action)
  VALUES (p_evidence_id, actor, p_action);
  RETURN fact;
END $$;
REVOKE EXECUTE ON FUNCTION public.review_trim_msrp_evidence(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_trim_msrp_evidence(uuid, text) TO authenticated;
