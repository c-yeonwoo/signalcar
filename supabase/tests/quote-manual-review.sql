-- Isolated Supabase DB only. All fixtures and review actions roll back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'owner@sc016.invalid'),
  ('e0000000-0000-4000-8000-000000000002', 'reviewer@sc016.invalid'),
  ('e0000000-0000-4000-8000-000000000003', 'admin-not-appointed@sc016.invalid');
UPDATE public.profiles SET is_admin = true
WHERE id IN (
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003'
);
INSERT INTO public.quote_reviewers (user_id)
VALUES ('e0000000-0000-4000-8000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('quote-docs', 'e0000000-0000-4000-8000-000000000001/test.png', 'e0000000-0000-4000-8000-000000000001');
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.quote_diagnoses (user_id, doc_path, reviewed_by)
    VALUES ('e0000000-0000-4000-8000-000000000001',
            'e0000000-0000-4000-8000-000000000001/test.png',
            'e0000000-0000-4000-8000-000000000002');
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'owner assigned their own reviewer'; END IF;
END $$;
INSERT INTO public.quote_diagnoses (id, user_id, doc_path) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001/test.png');

DO $$
DECLARE blocked boolean := false;
BEGIN
  IF has_table_privilege('authenticated', 'public.quote_diagnoses', 'UPDATE') THEN
    RAISE EXCEPTION 'end users can update review status directly';
  END IF;
  BEGIN
    PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000001', 'claim');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'owner claimed their own quote'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000003', true);
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000001', 'claim');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'unappointed admin claimed a quote'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'quote-docs') THEN
    RAISE EXCEPTION 'unappointed admin read a quote image';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
DO $$
BEGIN
  IF NOT public.is_quote_reviewer() THEN RAISE EXCEPTION 'appointed admin rejected'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'quote-docs') THEN
    RAISE EXCEPTION 'reviewer read image before claim';
  END IF;
END $$;
DO $$ BEGIN
  PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000001', 'claim');
END $$;
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'quote-docs') <> 1 THEN
    RAISE EXCEPTION 'claiming reviewer cannot read image';
  END IF;
END $$;
DO $$ BEGIN
  PERFORM public.review_quote_diagnosis(
    'e1000000-0000-4000-8000-000000000001', 'complete', '항목 확인', '검토 결과 설명'
  );
END $$;
DO $$
DECLARE blocked boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'quote-docs') THEN
    RAISE EXCEPTION 'completed reviewer retained image access';
  END IF;
  IF (SELECT count(*) FROM public.quote_review_events WHERE diagnosis_id = 'e1000000-0000-4000-8000-000000000001') <> 2 THEN
    RAISE EXCEPTION 'review actions were not audited';
  END IF;
  BEGIN
    PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000001', 'complete', 'again', 'again');
  EXCEPTION WHEN invalid_parameter_value THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'completed quote was reviewed twice'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
DO $$
BEGIN
  IF (SELECT status FROM public.quote_diagnoses WHERE id = 'e1000000-0000-4000-8000-000000000001') <> 'done'
     OR (SELECT result->>'headline' FROM public.quote_diagnoses WHERE id = 'e1000000-0000-4000-8000-000000000001') <> '항목 확인' THEN
    RAISE EXCEPTION 'owner cannot recover completed review';
  END IF;
END $$;

INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('quote-docs', 'e0000000-0000-4000-8000-000000000001/fail.png', 'e0000000-0000-4000-8000-000000000001');
INSERT INTO public.quote_diagnoses (id, user_id, doc_path) VALUES
  ('e1000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001/fail.png');
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000002', 'claim');
  PERFORM public.review_quote_diagnosis('e1000000-0000-4000-8000-000000000002', 'fail', NULL, '이미지 판독 불가');
END $$;
SELECT set_config('request.jwt.claim.sub', 'e0000000-0000-4000-8000-000000000001', true);
DO $$
BEGIN
  IF (SELECT status FROM public.quote_diagnoses WHERE id = 'e1000000-0000-4000-8000-000000000002') <> 'failed'
     OR (SELECT result->>'reason' FROM public.quote_diagnoses WHERE id = 'e1000000-0000-4000-8000-000000000002') <> '이미지 판독 불가' THEN
    RAISE EXCEPTION 'owner cannot recover failure reason';
  END IF;
END $$;

ROLLBACK;
