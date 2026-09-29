-- Disposable Supabase DB only; fixtures and privileged actions roll back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'reader@sc011-catalog.invalid'),
  ('b2000000-0000-4000-8000-000000000002', 'admin@sc011-catalog.invalid');
UPDATE public.profiles SET is_admin = true
WHERE id = 'b2000000-0000-4000-8000-000000000002';
INSERT INTO public.ingest_runs (pipeline, status) VALUES ('catalog-parse', 'ok');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ingest_loop_config
    WHERE job_id = 'catalog-parse' AND enabled = false) THEN
    RAISE EXCEPTION 'catalog parser is still scheduled for writes';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000001', true);
DO $$
DECLARE affected integer; blocked boolean := false;
BEGIN
  UPDATE public.ingest_loop_config SET enabled = true WHERE job_id = 'catalog-parse';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 OR EXISTS (SELECT 1 FROM public.ingest_loop_config) THEN
    RAISE EXCEPTION 'ordinary account controls ingest jobs';
  END IF;
  BEGIN
    INSERT INTO public.ingest_run_requests (job_id) VALUES ('catalog-parse');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'ordinary account enqueued a service-role job'; END IF;
  IF EXISTS (SELECT 1 FROM public.ingest_runs) THEN
    RAISE EXCEPTION 'ordinary account can read ingest logs';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'b2000000-0000-4000-8000-000000000002', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ingest_loop_config WHERE job_id = 'catalog-parse')
     OR NOT EXISTS (SELECT 1 FROM public.ingest_runs WHERE pipeline = 'catalog-parse') THEN
    RAISE EXCEPTION 'admin lost ingest audit access';
  END IF;
  INSERT INTO public.ingest_run_requests (job_id) VALUES ('catalog-parse');
END $$;

ROLLBACK;
