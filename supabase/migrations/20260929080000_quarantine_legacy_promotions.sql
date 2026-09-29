-- Parsed benefit amounts can be conditional maxima or matched to the wrong trim.
-- Preserve rows for audit, but remove unreviewed promotions from public reads.
DROP POLICY IF EXISTS "promotions read" ON public.official_promotions;
UPDATE public.ingest_loop_config SET enabled = false WHERE job_id = 'promo-etl';
