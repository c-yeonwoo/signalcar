-- send-alerts + profile-bootstrap loop jobs
INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('send-alerts', true),
  ('profile-bootstrap', true)
ON CONFLICT (job_id) DO NOTHING;
