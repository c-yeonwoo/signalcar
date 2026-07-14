-- Ingest loop: admin config, manual run requests, runs visibility
CREATE TABLE IF NOT EXISTS public.ingest_loop_config (
  job_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS public.ingest_run_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL, -- job id or 'all'
  status text NOT NULL DEFAULT 'pending', -- pending|claimed|done|failed
  requested_by text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  result jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ingest_run_requests_status
  ON public.ingest_run_requests (status, requested_at);

-- Seed default job toggles
INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('catalog-index', true),
  ('news-index', true),
  ('aggregate-signals', true),
  ('sales-kot', true),
  ('danawa-sales-preview', true)
ON CONFLICT (job_id) DO NOTHING;

GRANT SELECT ON public.ingest_runs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ingest_loop_config TO authenticated;
GRANT SELECT, INSERT ON public.ingest_run_requests TO authenticated;
GRANT SELECT ON public.ingest_run_requests TO authenticated;
GRANT ALL ON public.ingest_loop_config, public.ingest_run_requests, public.ingest_runs TO service_role;

ALTER TABLE public.ingest_loop_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_run_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingest_runs read auth" ON public.ingest_runs;
CREATE POLICY "ingest_runs read auth"
  ON public.ingest_runs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ingest_loop_config auth" ON public.ingest_loop_config;
CREATE POLICY "ingest_loop_config auth"
  ON public.ingest_loop_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ingest_run_requests read" ON public.ingest_run_requests;
CREATE POLICY "ingest_run_requests read"
  ON public.ingest_run_requests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ingest_run_requests insert" ON public.ingest_run_requests;
CREATE POLICY "ingest_run_requests insert"
  ON public.ingest_run_requests FOR INSERT TO authenticated WITH CHECK (true);
