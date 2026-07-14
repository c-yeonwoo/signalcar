-- Gate 0: seed 10 trims + price_signals + unlock RPC
-- Fixed UUIDs match src/lib/mock-cars.ts TRIM_ID_MAP

-- Brand IDs (resolve by name — seed brands already exist)
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

  IF b_hyundai IS NULL OR b_kia IS NULL OR b_genesis IS NULL OR b_renault IS NULL THEN
    RAISE NOTICE 'Gate0 seed skipped: brands missing';
    RETURN;
  END IF;

  -- Vehicles (fixed ids)
  INSERT INTO public.vehicles (id, brand_id, model_name, body_type, fuel_type) VALUES
    ('11111111-1111-1111-1111-111111110001', b_renault, '그랑콜레오스', 'suv', 'hybrid'),
    ('11111111-1111-1111-1111-111111110002', b_hyundai, '싼타페', 'suv', 'hybrid'),
    ('11111111-1111-1111-1111-111111110003', b_kia, '쏘렌토', 'suv', 'hybrid'),
    ('11111111-1111-1111-1111-111111110004', b_hyundai, '쏘나타', 'sedan', 'hybrid'),
    ('11111111-1111-1111-1111-111111110005', b_kia, 'K5', 'sedan', 'hybrid'),
    ('11111111-1111-1111-1111-111111110006', b_kia, '카니발', 'minivan', 'hybrid'),
    ('11111111-1111-1111-1111-111111110007', b_hyundai, '팰리세이드', 'suv', 'hybrid'),
    ('11111111-1111-1111-1111-111111110008', b_kia, 'EV3', 'suv', 'ev'),
    ('11111111-1111-1111-1111-111111110009', b_hyundai, '아반떼', 'sedan', 'hybrid'),
    ('11111111-1111-1111-1111-111111110010', b_genesis, 'GV70', 'suv', 'gasoline')
  ON CONFLICT (id) DO NOTHING;

  -- Trims (TRIM_ID_MAP)
  INSERT INTO public.trims (id, vehicle_id, name, base_price) VALUES
    ('22222222-2222-2222-2222-222222220001', '11111111-1111-1111-1111-111111110001', '하이브리드 인스파이어', 39900000),
    ('22222222-2222-2222-2222-222222220002', '11111111-1111-1111-1111-111111110002', '캘리그래피 하이브리드 4WD', 49800000),
    ('22222222-2222-2222-2222-222222220003', '11111111-1111-1111-1111-111111110003', '노블레스 하이브리드 7인승', 47600000),
    ('22222222-2222-2222-2222-222222220004', '11111111-1111-1111-1111-111111110004', '인스퍼레이션 하이브리드', 38900000),
    ('22222222-2222-2222-2222-222222220005', '11111111-1111-1111-1111-111111110005', '시그니처 하이브리드', 37600000),
    ('22222222-2222-2222-2222-222222220006', '11111111-1111-1111-1111-111111110006', '시그니처 하이브리드 9인승', 49800000),
    ('22222222-2222-2222-2222-222222220007', '11111111-1111-1111-1111-111111110007', '캘리그래피 하이브리드', 62800000),
    ('22222222-2222-2222-2222-222222220008', '11111111-1111-1111-1111-111111110008', 'GT라인', 49950000),
    ('22222222-2222-2222-2222-222222220009', '11111111-1111-1111-1111-111111110009', '인스퍼레이션 하이브리드', 28900000),
    ('22222222-2222-2222-2222-222222220010', '11111111-1111-1111-1111-111111110010', '2.5T AWD', 61200000)
  ON CONFLICT (id) DO NOTHING;

  -- Latest month signals (aligned with mock-cars)
  INSERT INTO public.price_signals (trim_id, month, median_deal_price, sample_size, promo_percentile, timing_verdict) VALUES
    ('22222222-2222-2222-2222-222222220001', '2026-07-01', 36800000, 47, 88, 'buy'),
    ('22222222-2222-2222-2222-222222220002', '2026-07-01', 48200000, 128, 22, 'wait'),
    ('22222222-2222-2222-2222-222222220003', '2026-07-01', 45300000, 96, 55, 'neutral'),
    ('22222222-2222-2222-2222-222222220004', '2026-07-01', 36100000, 64, 72, 'buy'),
    ('22222222-2222-2222-2222-222222220005', '2026-07-01', 34900000, 52, 78, 'buy'),
    ('22222222-2222-2222-2222-222222220006', '2026-07-01', 47900000, 88, 48, 'neutral'),
    ('22222222-2222-2222-2222-222222220007', '2026-07-01', 60100000, 41, 28, 'wait'),
    ('22222222-2222-2222-2222-222222220008', '2026-07-01', 45200000, 37, 81, 'buy'),
    ('22222222-2222-2222-2222-222222220009', '2026-07-01', 26800000, 112, 55, 'neutral'),
    ('22222222-2222-2222-2222-222222220010', '2026-07-01', 56800000, 29, 35, 'wait')
  ON CONFLICT (trim_id, month) DO UPDATE SET
    median_deal_price = EXCLUDED.median_deal_price,
    sample_size = EXCLUDED.sample_size,
    promo_percentile = EXCLUDED.promo_percentile,
    timing_verdict = EXCLUDED.timing_verdict,
    computed_at = now();
END $$;

-- Transferable credit unlock: deal_reports count - purchase unlocks > 0
CREATE OR REPLACE FUNCTION public.unlock_briefing_with_credit(p_trim_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  earned int;
  spent int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT count(*)::int INTO earned FROM public.deal_reports WHERE user_id = uid;
  SELECT count(*)::int INTO spent FROM public.report_unlocks
    WHERE user_id = uid AND source = 'purchase';

  -- Auto unlock from deal_report trigger does not consume transferable credit.
  -- Transferable pool = earned reports - purchase unlocks.
  IF earned - spent <= 0 THEN
    RAISE EXCEPTION 'no credit remaining';
  END IF;

  INSERT INTO public.report_unlocks (user_id, trim_id, source)
  VALUES (uid, p_trim_id, 'purchase')
  ON CONFLICT (user_id, trim_id) DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION public.unlock_briefing_with_credit(uuid) TO authenticated;
