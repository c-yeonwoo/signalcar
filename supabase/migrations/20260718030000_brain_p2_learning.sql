-- Brain P2: learnable weights, timing evals, signal alert queue

CREATE TABLE IF NOT EXISTS public.brain_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('match', 'timing')),
  version text NOT NULL,
  weights jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_weights_active_scope
  ON public.brain_weights (scope)
  WHERE active = true;

GRANT SELECT ON public.brain_weights TO anon, authenticated;
GRANT ALL ON public.brain_weights TO service_role;

ALTER TABLE public.brain_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brain_weights read" ON public.brain_weights;
CREATE POLICY "brain_weights read" ON public.brain_weights
  FOR SELECT TO anon, authenticated USING (true);

-- Seed default match weights (v1.2.0)
INSERT INTO public.brain_weights (scope, version, weights, active, notes) VALUES
(
  'match',
  'v1.2.0',
  '{
    "budget_in": 35,
    "budget_overlap": 18,
    "budget_miss": -18,
    "body_match": 22,
    "body_miss": -8,
    "seats_5plus": 14,
    "seats_12": 10,
    "usage_family": 12,
    "usage_leisure": 12,
    "usage_commute": 10,
    "usage_longhaul": 8,
    "fuel_match": 18,
    "fuel_miss": -14,
    "timing_now_buy": 12,
    "timing_now_wait": -8,
    "timing_now_score": 6,
    "timing_later_wait": 6,
    "timing_later_buy": 2,
    "tag_hot": 4,
    "tag_discount": 3
  }'::jsonb,
  true,
  'P2 default match weights'
)
ON CONFLICT (scope, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.timing_evals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  feature_date date NOT NULL,
  predicted_verdict text NOT NULL,
  predicted_score numeric NOT NULL DEFAULT 0,
  brain_version text NOT NULL,
  median_at_prediction numeric,
  median_after numeric,
  price_change_ratio numeric,
  actual_label text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trim_id, feature_date, brain_version)
);

CREATE INDEX IF NOT EXISTS idx_timing_evals_label
  ON public.timing_evals (actual_label, feature_date DESC);

GRANT SELECT ON public.timing_evals TO authenticated;
GRANT ALL ON public.timing_evals TO service_role;

ALTER TABLE public.timing_evals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timing_evals admin read" ON public.timing_evals;
CREATE POLICY "timing_evals admin read" ON public.timing_evals
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.signal_alert_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  trim_id uuid REFERENCES public.trims(id) ON DELETE SET NULL,
  car_slug text,
  kind text NOT NULL DEFAULT 'buy_transition',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_alert_queue_status
  ON public.signal_alert_queue (status, created_at);

GRANT SELECT ON public.signal_alert_queue TO authenticated;
GRANT ALL ON public.signal_alert_queue TO service_role;

ALTER TABLE public.signal_alert_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_alert_queue self read" ON public.signal_alert_queue;
CREATE POLICY "signal_alert_queue self read" ON public.signal_alert_queue
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "signal_alert_queue admin read" ON public.signal_alert_queue;
CREATE POLICY "signal_alert_queue admin read" ON public.signal_alert_queue
  FOR SELECT TO authenticated USING (public.is_admin());

INSERT INTO public.ingest_loop_config (job_id, enabled) VALUES
  ('learn-match', true),
  ('timing-eval', true),
  ('signal-alerts', true)
ON CONFLICT (job_id) DO NOTHING;
