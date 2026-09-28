-- SC-010 운영 가격·시드 감사. SELECT만 실행하며 원본 계약서/사용자 식별자는 반환하지 않는다.
-- 실행 전 대상 프로젝트/백업 위치/실행자·시각을 별도 감사 기록에 남긴다.

-- 1. 전체 규모와 제보 검증 상태. 숫자 자체가 사실성의 증거는 아니다.
SELECT 'trims' AS entity, count(*) AS rows FROM public.trims
UNION ALL
SELECT 'price_signals', count(*) FROM public.price_signals
UNION ALL
SELECT 'deal_reports', count(*) FROM public.deal_reports;

SELECT verification_status, count(*) AS reports,
       count(*) FILTER (WHERE contract_month IS NULL) AS missing_contract_month,
       count(*) FILTER (WHERE contract_price <= 0) AS nonpositive_price
FROM public.deal_reports
GROUP BY verification_status
ORDER BY verification_status;

-- 2. 마이그레이션에 적힌 2026-07 고정 시드 11건과 현재 값을 비교한다.
-- fingerprint가 다르더라도 실제 자료라는 뜻은 아니며, 같다면 원천 확인 전 공개 불가다.
WITH seed(trim_id, month, median_deal_price, sample_size) AS (
  VALUES
    ('22222222-2222-2222-2222-222222220001'::uuid, '2026-07-01'::date, 36800000::bigint, 47),
    ('22222222-2222-2222-2222-222222220002'::uuid, '2026-07-01'::date, 48200000::bigint, 128),
    ('22222222-2222-2222-2222-222222220003'::uuid, '2026-07-01'::date, 45300000::bigint, 96),
    ('22222222-2222-2222-2222-222222220004'::uuid, '2026-07-01'::date, 36100000::bigint, 64),
    ('22222222-2222-2222-2222-222222220005'::uuid, '2026-07-01'::date, 34900000::bigint, 52),
    ('22222222-2222-2222-2222-222222220006'::uuid, '2026-07-01'::date, 47900000::bigint, 88),
    ('22222222-2222-2222-2222-222222220007'::uuid, '2026-07-01'::date, 60100000::bigint, 41),
    ('22222222-2222-2222-2222-222222220008'::uuid, '2026-07-01'::date, 45200000::bigint, 37),
    ('22222222-2222-2222-2222-222222220009'::uuid, '2026-07-01'::date, 26800000::bigint, 112),
    ('22222222-2222-2222-2222-222222220010'::uuid, '2026-07-01'::date, 56800000::bigint, 29),
    ('22222222-2222-2222-2222-222222220011'::uuid, '2026-07-01'::date, 48900000::bigint, 64)
), verified AS (
  SELECT trim_id, date_trunc('month', contract_month)::date AS month,
         count(*)::int AS verified_n,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY contract_price))::numeric)::bigint AS verified_median
  FROM public.deal_reports
  WHERE verification_status = 'receipt_verified'
    AND contract_month IS NOT NULL AND contract_price > 0
  GROUP BY trim_id, date_trunc('month', contract_month)::date
)
SELECT seed.trim_id, seed.month,
       signals.median_deal_price AS current_median,
       signals.sample_size AS current_n,
       signals.computed_at,
       verified.verified_n,
       verified.verified_median,
       coalesce(signals.median_deal_price = seed.median_deal_price
        AND signals.sample_size = seed.sample_size, false) AS matches_known_seed,
       (verified.trim_id IS NOT NULL
        AND signals.median_deal_price IS NOT DISTINCT FROM verified.verified_median
        AND signals.sample_size IS NOT DISTINCT FROM verified.verified_n) AS matches_verified_aggregate
FROM seed
LEFT JOIN public.price_signals AS signals USING (trim_id, month)
LEFT JOIN verified USING (trim_id, month)
ORDER BY seed.trim_id;

-- 3. 전체 월·트림 신호가 검증 제보의 집계와 다를 가능성. 집계식/중복 제보 검사는 별도다.
WITH verified AS (
  SELECT trim_id, date_trunc('month', contract_month)::date AS month,
         count(*)::int AS verified_n,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY contract_price))::numeric)::bigint AS verified_median
  FROM public.deal_reports
  WHERE verification_status = 'receipt_verified'
    AND contract_month IS NOT NULL AND contract_price > 0
  GROUP BY trim_id, date_trunc('month', contract_month)::date
)
SELECT count(*) AS signal_rows,
       count(*) FILTER (WHERE verified.trim_id IS NULL AND (signals.sample_size > 0 OR signals.median_deal_price IS NOT NULL)) AS signal_without_verified_reports,
       count(*) FILTER (WHERE verified.trim_id IS NOT NULL AND
         (signals.sample_size IS DISTINCT FROM verified.verified_n
          OR signals.median_deal_price IS DISTINCT FROM verified.verified_median)) AS mismatched_verified_aggregate
FROM public.price_signals AS signals
LEFT JOIN verified USING (trim_id, month);
