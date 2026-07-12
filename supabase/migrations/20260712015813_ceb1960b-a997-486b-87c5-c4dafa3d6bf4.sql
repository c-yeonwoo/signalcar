CREATE TABLE public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trim_id uuid not null,
  target_price bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, trim_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts select" ON public.price_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own alerts insert" ON public.price_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own alerts update" ON public.price_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own alerts delete" ON public.price_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();