
-- Enums
CREATE TYPE public.body_type AS ENUM ('sedan','suv','hatchback','wagon','coupe','convertible','pickup','van','minivan','other');
CREATE TYPE public.fuel_type AS ENUM ('gasoline','diesel','hybrid','phev','ev','lpg','hydrogen','other');
CREATE TYPE public.option_category AS ENUM ('exterior','interior','convenience','safety','powertrain','package','other');
CREATE TYPE public.promotion_type AS ENUM ('cash','finance','trade_in','other');
CREATE TYPE public.finance_type AS ENUM ('cash','installment','lease','rent');
CREATE TYPE public.deal_source AS ENUM ('manual','receipt_ocr','community');
CREATE TYPE public.verification_status AS ENUM ('unverified','receipt_verified','flagged');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
-- TODO: replace with admin-role gated policies once auth is added
CREATE POLICY "Open access brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  generation TEXT,
  body_type public.body_type,
  fuel_type public.fuel_type,
  launched_at DATE,
  discontinued_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_brand ON public.vehicles(brand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trims
CREATE TABLE public.trims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_price BIGINT,
  released_at DATE,
  discontinued_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trims_vehicle ON public.trims(vehicle_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trims TO anon, authenticated;
GRANT ALL ON public.trims TO service_role;
ALTER TABLE public.trims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access trims" ON public.trims FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_trims_updated BEFORE UPDATE ON public.trims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- trim_options
CREATE TABLE public.trim_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id UUID NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  category public.option_category NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  price BIGINT DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trim_options_trim ON public.trim_options(trim_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trim_options TO anon, authenticated;
GRANT ALL ON public.trim_options TO service_role;
ALTER TABLE public.trim_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access trim_options" ON public.trim_options FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_trim_options_updated BEFORE UPDATE ON public.trim_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- official_promotions
CREATE TABLE public.official_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id UUID NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  discount_type public.promotion_type NOT NULL DEFAULT 'cash',
  amount BIGINT NOT NULL DEFAULT 0,
  description TEXT,
  source_url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_promotions_trim_month ON public.official_promotions(trim_id, month DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_promotions TO anon, authenticated;
GRANT ALL ON public.official_promotions TO service_role;
ALTER TABLE public.official_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access promotions" ON public.official_promotions FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.official_promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- deal_reports
CREATE TABLE public.deal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id UUID NOT NULL REFERENCES public.trims(id) ON DELETE CASCADE,
  contract_price BIGINT NOT NULL,
  list_price BIGINT,
  discount_amount BIGINT,
  options_taken JSONB DEFAULT '[]'::jsonb,
  finance_type public.finance_type,
  region TEXT,
  contract_month DATE,
  source public.deal_source NOT NULL DEFAULT 'manual',
  verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_trim_month ON public.deal_reports(trim_id, contract_month DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_reports TO anon, authenticated;
GRANT ALL ON public.deal_reports TO service_role;
ALTER TABLE public.deal_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access deal_reports" ON public.deal_reports FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deal_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brand seed (국내 5대 브랜드만)
INSERT INTO public.brands (name, name_en, country) VALUES
  ('현대', 'Hyundai', 'KR'),
  ('기아', 'Kia', 'KR'),
  ('제네시스', 'Genesis', 'KR'),
  ('KG모빌리티', 'KG Mobility', 'KR'),
  ('르노코리아', 'Renault Korea', 'KR')
ON CONFLICT (name) DO NOTHING;
