-- Real catalog layer: slug + car_profiles + history + admin write + news seed
-- Apply via Lovable sync or: supabase db push

-- ─── slug columns ───────────────────────────────────────────
ALTER TABLE public.trims ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trims_slug ON public.trims (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_slug ON public.vehicles (slug) WHERE slug IS NOT NULL;

-- ─── car_profiles (UI 콘텐츠 · benefits JSON) ───────────────
CREATE TABLE IF NOT EXISTS public.car_profiles (
  trim_id uuid PRIMARY KEY REFERENCES public.trims(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  body_type_label text,
  headline text,
  coach text,
  image_color text,
  fuel_efficiency numeric,
  insurance_annual bigint,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  promo_label text,
  promo_amount bigint DEFAULT 0,
  promo_note text,
  facelift jsonb,
  published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_profiles_slug ON public.car_profiles (slug);

GRANT SELECT ON public.car_profiles TO anon, authenticated;
GRANT ALL ON public.car_profiles TO service_role;

ALTER TABLE public.car_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "car_profiles read" ON public.car_profiles;
CREATE POLICY "car_profiles read" ON public.car_profiles
  FOR SELECT TO anon, authenticated USING (published = true);

-- ─── admin helper ───────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admin write back for CMS (authenticated + is_admin)
DO $$
BEGIN
  -- brands
  DROP POLICY IF EXISTS "brands admin write" ON public.brands;
  CREATE POLICY "brands admin write" ON public.brands
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.brands TO authenticated;

  DROP POLICY IF EXISTS "vehicles admin write" ON public.vehicles;
  CREATE POLICY "vehicles admin write" ON public.vehicles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;

  DROP POLICY IF EXISTS "trims admin write" ON public.trims;
  CREATE POLICY "trims admin write" ON public.trims
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.trims TO authenticated;

  DROP POLICY IF EXISTS "trim_options admin write" ON public.trim_options;
  CREATE POLICY "trim_options admin write" ON public.trim_options
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.trim_options TO authenticated;

  DROP POLICY IF EXISTS "promotions admin write" ON public.official_promotions;
  CREATE POLICY "promotions admin write" ON public.official_promotions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.official_promotions TO authenticated;

  DROP POLICY IF EXISTS "car_profiles admin write" ON public.car_profiles;
  CREATE POLICY "car_profiles admin write" ON public.car_profiles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  GRANT INSERT, UPDATE, DELETE ON public.car_profiles TO authenticated;

  DROP POLICY IF EXISTS "deal_reports admin read" ON public.deal_reports;
  CREATE POLICY "deal_reports admin read" ON public.deal_reports
    FOR SELECT TO authenticated USING (public.is_admin() OR auth.uid() = user_id);
END $$;

-- ─── Gate0 slug + grandeur + profiles seed ──────────────────
DO $$
DECLARE
  b_hyundai uuid;
  b_kia uuid;
  b_genesis uuid;
  b_renault uuid;
BEGIN
  SELECT id INTO b_hyundai FROM public.brands WHERE name = '현대' LIMIT 1;
  SELECT id INTO b_kia FROM public.brands WHERE name = '기아' LIMIT 1;
  SELECT id INTO b_genesis FROM public.brands WHERE name = '제네시스' LIMIT 1;
  SELECT id INTO b_renault FROM public.brands WHERE name = '르노코리아' LIMIT 1;

  IF b_hyundai IS NULL THEN
    RAISE NOTICE 'real catalog seed skipped: brands missing';
    RETURN;
  END IF;

  -- vehicle slugs
  UPDATE public.vehicles SET slug = 'grand-koleos' WHERE id = '11111111-1111-1111-1111-111111110001';
  UPDATE public.vehicles SET slug = 'santafe' WHERE id = '11111111-1111-1111-1111-111111110002';
  UPDATE public.vehicles SET slug = 'sorento' WHERE id = '11111111-1111-1111-1111-111111110003';
  UPDATE public.vehicles SET slug = 'sonata' WHERE id = '11111111-1111-1111-1111-111111110004';
  UPDATE public.vehicles SET slug = 'k5' WHERE id = '11111111-1111-1111-1111-111111110005';
  UPDATE public.vehicles SET slug = 'carnival' WHERE id = '11111111-1111-1111-1111-111111110006';
  UPDATE public.vehicles SET slug = 'palisade' WHERE id = '11111111-1111-1111-1111-111111110007';
  UPDATE public.vehicles SET slug = 'ev3' WHERE id = '11111111-1111-1111-1111-111111110008';
  UPDATE public.vehicles SET slug = 'avante' WHERE id = '11111111-1111-1111-1111-111111110009';
  UPDATE public.vehicles SET slug = 'gv70' WHERE id = '11111111-1111-1111-1111-111111110010';

  -- trim slugs (= app car id)
  UPDATE public.trims SET slug = 'grand-koleos-inspire' WHERE id = '22222222-2222-2222-2222-222222220001';
  UPDATE public.trims SET slug = 'santafe-calligraphy' WHERE id = '22222222-2222-2222-2222-222222220002';
  UPDATE public.trims SET slug = 'sorento-noblesse' WHERE id = '22222222-2222-2222-2222-222222220003';
  UPDATE public.trims SET slug = 'hyundai-sonata' WHERE id = '22222222-2222-2222-2222-222222220004';
  UPDATE public.trims SET slug = 'kia-k5' WHERE id = '22222222-2222-2222-2222-222222220005';
  UPDATE public.trims SET slug = 'kia-carnival' WHERE id = '22222222-2222-2222-2222-222222220006';
  UPDATE public.trims SET slug = 'hyundai-palisade' WHERE id = '22222222-2222-2222-2222-222222220007';
  UPDATE public.trims SET slug = 'kia-ev3' WHERE id = '22222222-2222-2222-2222-222222220008';
  UPDATE public.trims SET slug = 'hyundai-avante' WHERE id = '22222222-2222-2222-2222-222222220009';
  UPDATE public.trims SET slug = 'genesis-gv70' WHERE id = '22222222-2222-2222-2222-222222220010';

  -- Grandeur
  INSERT INTO public.vehicles (id, brand_id, model_name, body_type, fuel_type, slug) VALUES
    ('11111111-1111-1111-1111-111111110011', b_hyundai, '그랜저', 'sedan', 'hybrid', 'grandeur')
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug;

  INSERT INTO public.trims (id, vehicle_id, name, base_price, slug) VALUES
    ('22222222-2222-2222-2222-222222220011', '11111111-1111-1111-1111-111111110011', '더 뉴 그랜저 캘리그래피', 50890000, 'hyundai-grandeur')
  ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, base_price = EXCLUDED.base_price;

  INSERT INTO public.price_signals (trim_id, month, median_deal_price, sample_size, promo_percentile, timing_verdict) VALUES
    ('22222222-2222-2222-2222-222222220011', '2026-07-01', 48900000, 64, 58, 'neutral')
  ON CONFLICT (trim_id, month) DO UPDATE SET
    median_deal_price = EXCLUDED.median_deal_price,
    sample_size = EXCLUDED.sample_size,
    promo_percentile = EXCLUDED.promo_percentile,
    timing_verdict = EXCLUDED.timing_verdict;

  -- 6개월 히스토리 (만원 단위 스파크라인용 median)
  INSERT INTO public.price_signals (trim_id, month, median_deal_price, sample_size, timing_verdict) VALUES
    ('22222222-2222-2222-2222-222222220001', '2026-02-01', 37200000, 20, 'neutral'),
    ('22222222-2222-2222-2222-222222220001', '2026-03-01', 37050000, 25, 'neutral'),
    ('22222222-2222-2222-2222-222222220001', '2026-04-01', 36900000, 30, 'buy'),
    ('22222222-2222-2222-2222-222222220001', '2026-05-01', 36950000, 35, 'buy'),
    ('22222222-2222-2222-2222-222222220001', '2026-06-01', 37100000, 40, 'buy'),
    ('22222222-2222-2222-2222-222222220002', '2026-02-01', 48700000, 40, 'wait'),
    ('22222222-2222-2222-2222-222222220002', '2026-03-01', 48550000, 50, 'wait'),
    ('22222222-2222-2222-2222-222222220002', '2026-04-01', 48400000, 70, 'wait'),
    ('22222222-2222-2222-2222-222222220002', '2026-05-01', 48350000, 90, 'wait'),
    ('22222222-2222-2222-2222-222222220002', '2026-06-01', 48200000, 110, 'wait'),
    ('22222222-2222-2222-2222-222222220003', '2026-02-01', 45600000, 40, 'neutral'),
    ('22222222-2222-2222-2222-222222220003', '2026-03-01', 45500000, 50, 'neutral'),
    ('22222222-2222-2222-2222-222222220003', '2026-04-01', 45400000, 60, 'neutral'),
    ('22222222-2222-2222-2222-222222220003', '2026-05-01', 45350000, 70, 'neutral'),
    ('22222222-2222-2222-2222-222222220003', '2026-06-01', 45400000, 80, 'neutral')
  ON CONFLICT (trim_id, month) DO NOTHING;
END $$;

-- car_profiles content (benefits + coach)
INSERT INTO public.car_profiles (
  trim_id, slug, body_type_label, headline, coach, image_color,
  fuel_efficiency, insurance_annual, benefits, promo_label, promo_amount, promo_note, facelift
) VALUES
(
  '22222222-2222-2222-2222-222222220001', 'grand-koleos-inspire', '중형 SUV',
  '지금 사도 좋아요',
  '이번 달 프로모션이 최근 6개월 중 2번째로 좋아요. 밀어내기 시즌이라 추가 협상 여지도 충분.',
  'from-emerald-400 to-teal-500', 15.6, 950000,
  '[
    {"id":"gk-cash","category":"cash","title":"런칭 프로모션 현금 할인","amount":2200000,"note":"7월 계약분 · 재고 한정","stackable":false,"source":"official"},
    {"id":"gk-fin","category":"finance","title":"3.9% 저리 할부 (36개월)","amount":0,"note":"현금 할인과 택1","stackable":false,"source":"official"},
    {"id":"gk-card","category":"card","title":"삼성카드 제휴 할인","amount":700000,"note":"삼성카드 60개월 할부 · 신차 신청 시","stackable":true,"source":"external"},
    {"id":"gk-trade","category":"tradein","title":"타사 SUV 보상","amount":500000,"note":"동급 SUV 폐차/이전 시","stackable":true,"source":"official"},
    {"id":"gk-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"개소세·취득세 감면 (하이브리드)","stackable":true,"source":"external"},
    {"id":"gk-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":800000,"note":"지점별 편차 큼 · 협상 필요","stackable":true,"source":"dealer"},
    {"id":"gk-gift","category":"gift","title":"블랙박스 + 매트 패키지","amount":350000,"note":"출고 시 장착 지원","stackable":true,"source":"dealer"}
  ]'::jsonb,
  '현금할인 + 저리 할부', 2200000, '220만원 현금할인 또는 3.9% 저리',
  '{"month":"2026-02","note":"연식변경 예상"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222220002', 'santafe-calligraphy', '중형 SUV',
  '조금만 기다려봐요',
  '이번 달 공식 프로모션이 없어요. 다음 달 부분변경 발표 루머가 있어 재고 할인이 커질 가능성.',
  'from-amber-400 to-orange-500', 14.2, 1080000,
  '[
    {"id":"sf-card","category":"card","title":"현대카드 M 제휴 할인","amount":600000,"note":"M포인트 100만 사용 시 추가","stackable":true,"source":"external"},
    {"id":"sf-trade","category":"tradein","title":"패밀리 세이브 (재구매)","amount":400000,"note":"현대·기아 5년 이내 소유주","stackable":true,"source":"official"},
    {"id":"sf-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"개소세·취득세 감면 (하이브리드)","stackable":true,"source":"external"},
    {"id":"sf-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":500000,"note":"인기 모델 · 폭 작음","stackable":true,"source":"dealer"}
  ]'::jsonb,
  '프로모션 없음', 0, '공식 할인 없음 · 딜러 재량 할인만 존재',
  '{"month":"2026-01","note":"부분변경 루머"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222220003', 'sorento-noblesse', '중형 SUV',
  '평범한 시기예요',
  '실거래가·프로모션 모두 6개월 평균 수준. 급하지 않다면 12월 연말 재고 정리를 노려볼만해요.',
  'from-sky-400 to-indigo-500', 13.8, 1120000,
  '[
    {"id":"sr-fin","category":"finance","title":"저리 할부 4.5% (36개월)","amount":800000,"note":"동급 대비 -1.5%p 절감 효과","stackable":false,"source":"official"},
    {"id":"sr-card","category":"card","title":"KB국민카드 제휴","amount":500000,"note":"60개월 할부 · 신차 계약 시","stackable":true,"source":"external"},
    {"id":"sr-loyalty","category":"loyalty","title":"기아 패밀리 재구매","amount":300000,"note":"기아 차량 소유주","stackable":true,"source":"official"},
    {"id":"sr-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"개소세·취득세 감면 (하이브리드)","stackable":true,"source":"external"},
    {"id":"sr-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":700000,"note":"연말 재고 정리 시 확대 가능","stackable":true,"source":"dealer"}
  ]'::jsonb,
  '저리 할부', 800000, '3년 4.5% · 현금할인 없음', NULL
),
(
  '22222222-2222-2222-2222-222222220004', 'hyundai-sonata', '중형 세단',
  '할인 폭이 괜찮은 달이에요',
  '중형 세단 수요가 한산한 시기라 딜러 재량·카드 조합으로 중앙값 이하도 가능해요.',
  'from-slate-400 to-slate-600', 18.1, 820000,
  '[{"id":"sn-cash","category":"cash","title":"공식 현금 할인","amount":1500000,"note":"7월 계약분","stackable":false,"source":"official"},{"id":"sn-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"하이브리드","stackable":true,"source":"external"},{"id":"sn-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":600000,"note":"지점 편차","stackable":true,"source":"dealer"}]'::jsonb,
  '현금할인', 1500000, '150만원 또는 저리 택1', NULL
),
(
  '22222222-2222-2222-2222-222222220005', 'kia-k5', '중형 세단',
  '프로모션이 강한 편이에요',
  '쏘나타와 비슷한 타이밍. 재고 많은 색상부터 물어보면 추가 할인이 나와요.',
  'from-red-400 to-rose-600', 17.8, 800000,
  '[{"id":"k5-cash","category":"cash","title":"공식 현금 할인","amount":1800000,"note":"7월","stackable":false,"source":"official"},{"id":"k5-card","category":"card","title":"KB국민카드 제휴","amount":400000,"note":"신차 할부","stackable":true,"source":"external"},{"id":"k5-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":500000,"note":"재고 색상 우선","stackable":true,"source":"dealer"}]'::jsonb,
  '현금할인 + 카드', 1800000, '공식 180만 + 제휴 가능', NULL
),
(
  '22222222-2222-2222-2222-222222220006', 'kia-carnival', '미니밴',
  '수요가 꾸준한 차예요',
  '인기 트림은 할인 폭이 얇아요. 급하지 않으면 월말·분기말 재고를 노려보세요.',
  'from-violet-400 to-indigo-600', 12.4, 1150000,
  '[{"id":"cv-fin","category":"finance","title":"저리 할부","amount":600000,"note":"36개월","stackable":false,"source":"official"},{"id":"cv-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"하이브리드","stackable":true,"source":"external"},{"id":"cv-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":400000,"note":"인기 모델 · 폭 작음","stackable":true,"source":"dealer"}]'::jsonb,
  '저리 할부', 600000, '현금할인 약함', NULL
),
(
  '22222222-2222-2222-2222-222222220007', 'hyundai-palisade', '대형 SUV',
  '부분변경 전후를 보세요',
  '페이스리프트 루머가 있어 지금 풀옵션 계약은 감가 리스크가 있어요.',
  'from-stone-400 to-stone-700', 12.1, 1280000,
  '[{"id":"pl-trade","category":"tradein","title":"패밀리 세이브","amount":500000,"note":"현대·기아 재구매","stackable":true,"source":"official"},{"id":"pl-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"하이브리드","stackable":true,"source":"external"},{"id":"pl-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":700000,"note":"연식변경 전 재고","stackable":true,"source":"dealer"}]'::jsonb,
  '프로모션 약함', 300000, '공식 할인 미미',
  '{"month":"2026-09","note":"부분변경 예상"}'::jsonb
),
(
  '22222222-2222-2222-2222-222222220008', 'kia-ev3', '소형 전기 SUV',
  '보조금·할인이 겹치는 구간',
  '국비·지자체 보조금 잔여와 공식 할인을 같이 확인하세요. 잔여 소진 전에 계약하는 편이 유리해요.',
  'from-cyan-400 to-blue-600', 5.4, 980000,
  '[{"id":"ev3-cash","category":"cash","title":"공식 할인","amount":2000000,"note":"7월","stackable":false,"source":"official"},{"id":"ev3-eco","category":"eco","title":"전기차 보조금·세제","amount":0,"note":"지자체별 상이","stackable":true,"source":"external"},{"id":"ev3-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":500000,"note":"재고 한정","stackable":true,"source":"dealer"}]'::jsonb,
  '전기차 프로모션', 2000000, '보조금 별도', NULL
),
(
  '22222222-2222-2222-2222-222222220009', 'hyundai-avante', '준중형 세단',
  '표본이 많아 시세가 안정적이에요',
  '할인 폭은 평이합니다. 급하면 지금, 여유면 월말 재고를 한 번 더 물어보세요.',
  'from-sky-300 to-sky-600', 19.8, 720000,
  '[{"id":"av-cash","category":"cash","title":"공식 현금 할인","amount":800000,"note":"7월","stackable":false,"source":"official"},{"id":"av-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"하이브리드","stackable":true,"source":"external"},{"id":"av-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":400000,"note":"지점 편차","stackable":true,"source":"dealer"}]'::jsonb,
  '기본 프로모션', 800000, '평년 수준', NULL
),
(
  '22222222-2222-2222-2222-222222220010', 'genesis-gv70', '프리미엄 SUV',
  '프리미엄은 타이밍이 더 중요해요',
  '재고 모델·전시차는 할인 폭이 커요. 신차 주문이라면 분기 말까지 기다려볼 만합니다.',
  'from-zinc-500 to-zinc-800', 9.8, 1450000,
  '[{"id":"gv-cash","category":"cash","title":"재고 할인","amount":1200000,"note":"한정","stackable":false,"source":"official"},{"id":"gv-loyalty","category":"loyalty","title":"제네시스 재구매","amount":500000,"note":"기존 오너","stackable":true,"source":"official"},{"id":"gv-dealer","category":"cash","title":"딜러 재량 할인 (예상)","amount":900000,"note":"재고·전시차","stackable":true,"source":"dealer"}]'::jsonb,
  '재고 한정 할인', 1200000, '전시·재고 우선', NULL
),
(
  '22222222-2222-2222-2222-222222220011', 'hyundai-grandeur', '준대형 세단',
  '할부·트레이드인이 핵심이에요',
  '공식 현금 할인보다 모빌리티 할부·트레이드인 조건이 눈에 띕니다. 기변 계획이 있으면 현대/제네시스 매각 시 트레이드인 50만을 먼저 챙기세요.',
  'from-slate-400 to-slate-700', 16.2, 980000,
  '[{"id":"dnw-4802-fin-0","category":"finance","title":"기본조건 4.9% (36개월)","amount":0,"note":"4.9%(36개월) / 5.0%(48개월) / 5.1%(60개월) · 2026-07 기준 · 기본 할인조건 택1","stackable":false,"source":"official"},{"id":"dnw-trade","category":"tradein","title":"트레이드-인 특별조건","amount":500000,"note":"현대/제네시스 매각 시 최대 50만","stackable":true,"source":"official"},{"id":"gr-eco","category":"eco","title":"친환경차 세제혜택","amount":1430000,"note":"하이브리드","stackable":true,"source":"external"}]'::jsonb,
  '모빌리티 할부 4.9%', 0, '36개월 표준형 · 트레이드인 별도', NULL
)
ON CONFLICT (trim_id) DO UPDATE SET
  slug = EXCLUDED.slug,
  body_type_label = EXCLUDED.body_type_label,
  headline = EXCLUDED.headline,
  coach = EXCLUDED.coach,
  benefits = EXCLUDED.benefits,
  promo_label = EXCLUDED.promo_label,
  promo_amount = EXCLUDED.promo_amount,
  promo_note = EXCLUDED.promo_note,
  facelift = EXCLUDED.facelift,
  updated_at = now();

-- News from curated feed → news_items
INSERT INTO public.news_items (id, source_id, kind, tag, title, subtitle, url, published_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001', 'curated', 'promo', 'NEW 프로모션',
   '그랑콜레오스, 이번 달 220만원 현금할인',
   '밀어내기 시즌 · 최근 6개월 중 2번째로 좋은 조건',
   '/car/grand-koleos-inspire', CURRENT_DATE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002', 'curated', 'rumor', '부분변경 루머',
   '싼타페 F/L, 2026년 1월 공개 유력',
   '재고 할인 확대 가능성 · 지금 계약은 신중히',
   '/car/santafe-calligraphy', CURRENT_DATE - 3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0003', 'curated', 'facelift', '연식변경 예정',
   '그랑콜레오스 26년형, 2월 출시 예정',
   '현재 재고 소진 프로모션 진행 중',
   '/car/grand-koleos-inspire', CURRENT_DATE - 5)
ON CONFLICT (id) DO NOTHING;
