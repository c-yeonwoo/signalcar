-- Human quote review is available only to server-appointed reviewers who are also admins.
CREATE TABLE IF NOT EXISTS public.quote_reviewers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  appointed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_reviewers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_reviewers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.quote_reviewers TO service_role;

CREATE OR REPLACE FUNCTION public.is_quote_reviewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() AND EXISTS (
    SELECT 1 FROM public.quote_reviewers
    WHERE user_id = auth.uid() AND active
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_quote_reviewer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quote_reviewer() TO authenticated;

ALTER TABLE public.quote_diagnoses
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS "diagnoses self insert" ON public.quote_diagnoses;
CREATE POLICY "diagnoses self insert" ON public.quote_diagnoses
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND result IS NULL
    AND reviewed_by IS NULL
    AND review_started_at IS NULL
    AND reviewed_at IS NULL
    AND (storage.foldername(doc_path))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM storage.objects AS obj
      WHERE obj.bucket_id = 'quote-docs' AND obj.name = doc_path
        AND obj.owner_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "diagnoses reviewer read" ON public.quote_diagnoses;
CREATE POLICY "diagnoses reviewer read" ON public.quote_diagnoses
  FOR SELECT TO authenticated USING (public.is_quote_reviewer());

DROP POLICY IF EXISTS "quote-docs claimed reviewer read" ON storage.objects;
CREATE POLICY "quote-docs claimed reviewer read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'quote-docs'
    AND public.is_quote_reviewer()
    AND EXISTS (
      SELECT 1 FROM public.quote_diagnoses AS d
      WHERE d.doc_path = name
        AND d.status = 'reviewing'
        AND d.reviewed_by = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.quote_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id uuid REFERENCES public.quote_diagnoses(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('claim', 'complete', 'fail')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quote_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.quote_review_events TO authenticated;
GRANT ALL ON public.quote_review_events TO service_role;
DROP POLICY IF EXISTS "quote review events reviewer read" ON public.quote_review_events;
CREATE POLICY "quote review events reviewer read" ON public.quote_review_events
  FOR SELECT TO authenticated USING (public.is_quote_reviewer());

CREATE OR REPLACE FUNCTION public.review_quote_diagnosis(
  p_diagnosis_id uuid,
  p_action text,
  p_headline text DEFAULT NULL,
  p_summary text DEFAULT NULL
)
RETURNS public.quote_diagnoses
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid := auth.uid();
  current_row public.quote_diagnoses;
  updated_row public.quote_diagnoses;
BEGIN
  IF actor IS NULL OR NOT public.is_quote_reviewer() THEN
    RAISE EXCEPTION 'quote reviewer access required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO current_row FROM public.quote_diagnoses
  WHERE id = p_diagnosis_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'diagnosis not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'claim' AND current_row.status = 'pending' THEN
    UPDATE public.quote_diagnoses SET
      status = 'reviewing', reviewed_by = actor, review_started_at = now()
    WHERE id = p_diagnosis_id RETURNING * INTO updated_row;
  ELSIF p_action = 'complete' AND current_row.status = 'reviewing'
      AND current_row.reviewed_by = actor
      AND length(btrim(COALESCE(p_headline, ''))) BETWEEN 1 AND 120
      AND length(btrim(COALESCE(p_summary, ''))) BETWEEN 1 AND 2000 THEN
    UPDATE public.quote_diagnoses SET
      status = 'done',
      result = jsonb_build_object('headline', btrim(p_headline), 'summary', btrim(p_summary)),
      reviewed_at = now()
    WHERE id = p_diagnosis_id RETURNING * INTO updated_row;
  ELSIF p_action = 'fail' AND current_row.status = 'reviewing'
      AND current_row.reviewed_by = actor
      AND length(btrim(COALESCE(p_summary, ''))) BETWEEN 1 AND 500 THEN
    UPDATE public.quote_diagnoses SET
      status = 'failed', result = jsonb_build_object('reason', btrim(p_summary)), reviewed_at = now()
    WHERE id = p_diagnosis_id RETURNING * INTO updated_row;
  ELSE
    RAISE EXCEPTION 'invalid quote review transition' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.quote_review_events (diagnosis_id, actor_id, action)
  VALUES (p_diagnosis_id, actor, p_action);
  RETURN updated_row;
END $$;
REVOKE EXECUTE ON FUNCTION public.review_quote_diagnosis(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_quote_diagnosis(uuid, text, text, text)
  TO authenticated;
