# 마이그레이션 적용 (Lovable / Supabase)

로컬 CLI 링크가 계정 권한으로 막힌 경우, 아래 중 하나로 적용하세요.

## Lovable
연결된 브랜치에 `supabase/migrations/` 푸시 후 Lovable Cloud가 동기화합니다.

## Supabase Dashboard
1. Project `yrofpgecwgcjjwycalds` → SQL Editor
2. 순서대로 실행 (아직 미적용분):
   - `20260714140000_ingest_meta.sql`
   - `20260714200000_ingest_loop.sql`
   - `20260715010000_real_catalog.sql`
   - `20260717010000_brain_p0.sql` (Brain: car_features_daily · outcome_events · buyer_prefs)
   - `20260718010000_catalog_parse_job.sql` (ingest loop: catalog-parse)

## CLI (권한 있는 계정)
```bash
supabase link --project-ref yrofpgecwgcjjwycalds
supabase db push
```

적용 후 앱에서 `car_profiles`가 보이면 홈/탐색이 실데이터로 채워집니다.
