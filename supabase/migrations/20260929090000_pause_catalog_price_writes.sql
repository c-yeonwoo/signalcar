-- Keep existing catalog and source rows for audit; stop scheduled unreviewed MSRP writes.
INSERT INTO public.ingest_loop_config (job_id, enabled)
VALUES ('catalog-parse', false)
ON CONFLICT (job_id) DO UPDATE SET enabled = false;

-- Ingest controls invoke service-role workers, so an ordinary account must not
-- re-enable jobs or enqueue a forced run through PostgREST.
DROP POLICY IF EXISTS "ingest_loop_config auth" ON public.ingest_loop_config;
CREATE POLICY "ingest_loop_config admin" ON public.ingest_loop_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ingest_run_requests read" ON public.ingest_run_requests;
DROP POLICY IF EXISTS "ingest_run_requests insert" ON public.ingest_run_requests;
CREATE POLICY "ingest_run_requests admin read" ON public.ingest_run_requests
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "ingest_run_requests admin insert" ON public.ingest_run_requests
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ingest_runs read auth" ON public.ingest_runs;
CREATE POLICY "ingest_runs admin read" ON public.ingest_runs
  FOR SELECT TO authenticated USING (public.is_admin());
