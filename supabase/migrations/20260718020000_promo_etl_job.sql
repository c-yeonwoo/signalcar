-- Enable promo-etl in ingest loop config
INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('promo-etl', true)
ON CONFLICT (job_id) DO NOTHING;
