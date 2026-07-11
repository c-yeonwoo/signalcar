
-- =====================================================================
-- 신차 구매 코치: 백엔드 스키마 v1
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.timing_verdict AS ENUM ('buy','wait','neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.brief_status AS ENUM ('pending','done','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.unlock_source AS ENUM ('deal_report','purchase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- deal_source에 값 보강 (기존 enum이 있으면 값만 추가)
DO $$ BEGIN
  ALTER TYPE public.deal_source ADD VALUE IF NOT EXISTS 'receipt_ocr';
EXCEPTION WHEN undefined_object THEN
  CREATE TYPE public.deal_source AS ENUM ('manual','receipt_ocr','community');
END $$;

DO $$ BEGIN
  ALTER TYPE public.deal_source ADD VALUE IF NOT EXISTS 'community';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------- 공통 updated_at 트리거는 이미 존재 (public.update_updated_at_column) ----------

-- ---------- PROFILES ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles self insert" ON public.profiles;
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 가입 시 profile 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 마스터 테이블 RLS 재정비: 로그인 유저 읽기, 쓰기는 service_role ----------
-- brands
DROP POLICY IF EXISTS "Open access brands" ON public.brands;
DROP POLICY IF EXISTS "brands read" ON public.brands;
CREATE POLICY "brands read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.brands FROM anon, authenticated;
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;

-- vehicles
DROP POLICY IF EXISTS "Open access vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles read" ON public.vehicles;
CREATE POLICY "vehicles read" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.vehicles FROM anon, authenticated;
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;

-- trims
DROP POLICY IF EXISTS "Open access trims" ON public.trims;
DROP POLICY IF EXISTS "trims read" ON public.trims;
CREATE POLICY "trims read" ON public.trims FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.trims FROM anon, authenticated;
GRANT SELECT ON public.trims TO anon, authenticated;
GRANT ALL ON public.trims TO service_role;

-- trim_options
DROP POLICY IF EXISTS "Open access trim_options" ON public.trim_options;
DROP POLICY IF EXISTS "trim_options read" ON public.trim_options;
CREATE POLICY "trim_options read" ON public.trim_options FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.trim_options FROM anon, authenticated;
GRANT SELECT ON public.trim_options TO anon, authenticated;
GRANT ALL ON public.trim_options TO service_role;

-- official_promotions
DROP POLICY IF EXISTS "Open access promotions" ON public.official_promotions;
DROP POLICY IF EXISTS "promotions read" ON public.official_promotions;
CREATE POLICY "promotions read" ON public.official_promotions FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.official_promotions FROM anon, authenticated;
GRANT SELECT ON public.official_promotions TO anon, authenticated;
GRANT ALL ON public.official_promotions TO service_role;

-- ---------- SALES STATS ----------
CREATE TABLE IF NOT EXISTS public.sales_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  month date NOT NULL,
  registered_count int NOT NULL DEFAULT 0,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trim_id, month)
);
GRANT SELECT ON public.sales_stats TO anon, authenticated;
GRANT ALL ON public.sales_stats TO service_role;
ALTER TABLE public.sales_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sales_stats read" ON public.sales_stats;
CREATE POLICY "sales_stats read" ON public.sales_stats FOR SELECT TO anon, authenticated USING (true);

-- ---------- PRICE SIGNALS ----------
CREATE TABLE IF NOT EXISTS public.price_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  month date NOT NULL,
  median_deal_price bigint,
  sample_size int NOT NULL DEFAULT 0,
  promo_percentile numeric,
  timing_verdict public.timing_verdict,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trim_id, month)
);
GRANT SELECT ON public.price_signals TO anon, authenticated;
GRANT ALL ON public.price_signals TO service_role;
ALTER TABLE public.price_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_signals read" ON public.price_signals;
CREATE POLICY "price_signals read" ON public.price_signals FOR SELECT TO anon, authenticated USING (true);

-- ---------- WATCHLIST ----------
CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trim_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "watchlist self" ON public.watchlist;
CREATE POLICY "watchlist self select" ON public.watchlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "watchlist self insert" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "watchlist self delete" ON public.watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- DEAL REPORTS: 컬럼 보강 + RLS 재정비 ----------
ALTER TABLE public.deal_reports
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_doc_ref text;

DROP POLICY IF EXISTS "Open access deal_reports" ON public.deal_reports;

-- 유저는 자기 것만 select/insert. verification_status/raw_doc_ref는 update에서 별도 제어(워커만).
REVOKE INSERT, UPDATE, DELETE ON public.deal_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.deal_reports TO authenticated;
GRANT ALL ON public.deal_reports TO service_role;

DROP POLICY IF EXISTS "deal_reports self select" ON public.deal_reports;
CREATE POLICY "deal_reports self select" ON public.deal_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "deal_reports self insert" ON public.deal_reports;
CREATE POLICY "deal_reports self insert" ON public.deal_reports FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND raw_doc_ref IS NULL
    AND verification_status = 'unverified'
  );

-- ---------- NEGOTIATION BRIEFS ----------
CREATE TABLE IF NOT EXISTS public.negotiation_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  target_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  region text,
  budget bigint,
  finance_pref text,
  status public.brief_status NOT NULL DEFAULT 'pending',
  llm_output jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.negotiation_briefs TO authenticated;
GRANT ALL ON public.negotiation_briefs TO service_role;
ALTER TABLE public.negotiation_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs self select" ON public.negotiation_briefs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "briefs self insert" ON public.negotiation_briefs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND llm_output IS NULL);

DROP TRIGGER IF EXISTS trg_briefs_updated ON public.negotiation_briefs;
CREATE TRIGGER trg_briefs_updated BEFORE UPDATE ON public.negotiation_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- QUOTE DIAGNOSES ----------
CREATE TABLE IF NOT EXISTS public.quote_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trim_id uuid REFERENCES public.trims(id) ON DELETE SET NULL,
  doc_path text NOT NULL,
  status public.brief_status NOT NULL DEFAULT 'pending',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quote_diagnoses TO authenticated;
GRANT ALL ON public.quote_diagnoses TO service_role;
ALTER TABLE public.quote_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnoses self select" ON public.quote_diagnoses FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "diagnoses self insert" ON public.quote_diagnoses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND result IS NULL);

DROP TRIGGER IF EXISTS trg_diagnoses_updated ON public.quote_diagnoses;
CREATE TRIGGER trg_diagnoses_updated BEFORE UPDATE ON public.quote_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- REPORT UNLOCKS ----------
CREATE TABLE IF NOT EXISTS public.report_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trim_id uuid NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  source public.unlock_source NOT NULL,
  UNIQUE (user_id, trim_id)
);
GRANT SELECT, INSERT ON public.report_unlocks TO authenticated;
GRANT ALL ON public.report_unlocks TO service_role;
ALTER TABLE public.report_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlocks self select" ON public.report_unlocks FOR SELECT TO authenticated USING (user_id = auth.uid());
-- insert는 서버(트리거/워커)에서. 유저가 임의로 insert 못하도록 정책 없음 → 차단.

-- deal_report 제보 시 자동으로 report_unlocks 부여
CREATE OR REPLACE FUNCTION public.grant_unlock_on_deal_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.report_unlocks (user_id, trim_id, source)
    VALUES (NEW.user_id, NEW.trim_id, 'deal_report')
    ON CONFLICT (user_id, trim_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_unlock_on_deal_report ON public.deal_reports;
CREATE TRIGGER trg_unlock_on_deal_report
  AFTER INSERT ON public.deal_reports
  FOR EACH ROW EXECUTE FUNCTION public.grant_unlock_on_deal_report();

-- ---------- REALTIME ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_diagnoses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_signals;

-- ---------- STORAGE 정책 (quote-docs 버킷은 도구로 생성. 정책만 여기서) ----------
DO $$ BEGIN
  CREATE POLICY "quote-docs owner read" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'quote-docs' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "quote-docs owner insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'quote-docs' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "quote-docs owner delete" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'quote-docs' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
