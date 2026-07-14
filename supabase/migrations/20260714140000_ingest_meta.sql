-- Ingest pipeline metadata (catalog PDF index, run logs)
CREATE TABLE IF NOT EXISTS public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  brand_hint text,
  url text NOT NULL UNIQUE,
  file_name text,
  content_type text,
  parsed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline text NOT NULL,
  status text NOT NULL DEFAULT 'ok',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

CREATE TABLE IF NOT EXISTS public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text,
  kind text NOT NULL DEFAULT 'launch', -- launch|facelift|promo|rumor
  tag text,
  title text NOT NULL,
  subtitle text,
  url text,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  published_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.source_documents, public.ingest_runs, public.news_items TO anon, authenticated;
GRANT ALL ON public.source_documents, public.ingest_runs, public.news_items TO service_role;

ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "source_documents read" ON public.source_documents;
CREATE POLICY "source_documents read" ON public.source_documents FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "news_items read" ON public.news_items;
CREATE POLICY "news_items read" ON public.news_items FOR SELECT TO anon, authenticated USING (true);

-- ingest_runs: no public read (ops only via service_role)
