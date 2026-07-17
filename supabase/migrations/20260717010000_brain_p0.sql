-- Brain P0: feature store + outcomes + server prefs + market events
-- Apply via Lovable sync or Supabase SQL Editor (see supabase/MIGRATION.md)

-- ─── car_features_daily (Brain이 읽는 trim×일 피처) ─────────
CREATE TABLE IF NOT EXISTS public.car_features_daily (
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  feature_date date NOT NULL DEFAULT ((timezone('Asia/Seoul', now()))::date),
  median_deal_price numeric,
  p25_deal_price numeric,
  p75_deal_price numeric,
  sample_size integer NOT NULL DEFAULT 0,
  list_price numeric,
  discount_ratio numeric,
  promo_percentile numeric,
  promo_amount numeric,
  sales_registered_count integer,
  sales_momentum numeric,
  days_to_facelift integer,
  facelift_note text,
  timing_verdict text NOT NULL DEFAULT 'neutral'
    CHECK (timing_verdict IN ('buy', 'wait', 'neutral')),
  timing_score numeric NOT NULL DEFAULT 0,
  timing_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  brain_version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trim_id, feature_date)
);

CREATE INDEX IF NOT EXISTS idx_car_features_daily_date
  ON public.car_features_daily (feature_date DESC);
CREATE INDEX IF NOT EXISTS idx_car_features_daily_verdict
  ON public.car_features_daily (feature_date, timing_verdict);

GRANT SELECT ON public.car_features_daily TO anon, authenticated;
GRANT ALL ON public.car_features_daily TO service_role;

ALTER TABLE public.car_features_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "car_features_daily read" ON public.car_features_daily;
CREATE POLICY "car_features_daily read" ON public.car_features_daily
  FOR SELECT TO anon, authenticated USING (true);

-- ─── market_events (연식변경·출시 등) ───────────────────────
CREATE TABLE IF NOT EXISTS public.market_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id uuid REFERENCES public.trims(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date date,
  title text,
  impact text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_events_trim_date
  ON public.market_events (trim_id, event_date);

GRANT SELECT ON public.market_events TO anon, authenticated;
GRANT ALL ON public.market_events TO service_role;

ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_events read" ON public.market_events;
CREATE POLICY "market_events read" ON public.market_events
  FOR SELECT TO anon, authenticated USING (true);

-- ─── buyer_prefs (온보딩/코치 취향 서버화) ──────────────────
CREATE TABLE IF NOT EXISTS public.buyer_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text,
  seats text,
  mileage text,
  budget_max integer,
  timing text,
  body_pref text,
  fuel_pref text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.buyer_prefs TO authenticated;
GRANT ALL ON public.buyer_prefs TO service_role;

ALTER TABLE public.buyer_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_prefs self select" ON public.buyer_prefs;
CREATE POLICY "buyer_prefs self select" ON public.buyer_prefs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "buyer_prefs self insert" ON public.buyer_prefs;
CREATE POLICY "buyer_prefs self insert" ON public.buyer_prefs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "buyer_prefs self update" ON public.buyer_prefs;
CREATE POLICY "buyer_prefs self update" ON public.buyer_prefs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── outcome_events (학습 루프 입력) ────────────────────────
CREATE TABLE IF NOT EXISTS public.outcome_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  event_type text NOT NULL,
  trim_id uuid REFERENCES public.trims(id) ON DELETE SET NULL,
  car_slug text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  brain_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcome_events_type_created
  ON public.outcome_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_events_user_created
  ON public.outcome_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_events_trim_created
  ON public.outcome_events (trim_id, created_at DESC);

GRANT INSERT ON public.outcome_events TO anon, authenticated;
GRANT SELECT ON public.outcome_events TO authenticated;
GRANT ALL ON public.outcome_events TO service_role;

ALTER TABLE public.outcome_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outcome_events insert" ON public.outcome_events;
CREATE POLICY "outcome_events insert" ON public.outcome_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "outcome_events self select" ON public.outcome_events;
CREATE POLICY "outcome_events self select" ON public.outcome_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin read outcomes
DROP POLICY IF EXISTS "outcome_events admin select" ON public.outcome_events;
CREATE POLICY "outcome_events admin select" ON public.outcome_events
  FOR SELECT TO authenticated USING (public.is_admin());

-- ─── ingest loop job seed ───────────────────────────────────
INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('car-features', true)
ON CONFLICT (job_id) DO NOTHING;
