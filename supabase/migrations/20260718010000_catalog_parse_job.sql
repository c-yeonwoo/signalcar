-- Enable catalog-parse in ingest loop config
INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('catalog-parse', true)
ON CONFLICT (job_id) DO NOTHING;
