# SignalCar Data Ingest

정책: **경쟁사(겟차·다나와·엔카) 크롤링 금지**.  
허용: 공식 제조사 공개 자료 · 공공 OpenAPI · 1st-party(`deal_reports`) · 유료 라이선스(KAIDA 등).

## Quick start

```bash
# 필요한 API 키 목록
bun workers/ingest/run.ts keys

# 수집 루트 전체 목록
bun workers/ingest/run.ts sources

# 공식 카탈로그 PDF URL 인덱싱 (현대·기아·제네시스) — 키 불필요
bun workers/ingest/run.ts catalog-index

# 공식 뉴스룸 링크 인덱싱 — 키 불필요
bun workers/ingest/run.ts news-index

# deal_reports → price_signals 집계 (SERVICE_ROLE 필요)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun workers/ingest/run.ts aggregate-signals [--dry]

# Brain 피처 스토어 + timing_verdict (SERVICE_ROLE 필요)
bun workers/ingest/run.ts car-features [--dry]
# 또는: bun run ingest:features

# OEM 가격표 PDF → trims.base_price (SERVICE_ROLE 있으면 DB upsert)
bun workers/ingest/run.ts catalog-parse [--dry] [--limit 20] [--brand hyundai]
# 또는: bun run ingest:catalog-parse

# 공식 프로모션 월 ETL — 기아 이달의 구매 혜택 (SERVICE_ROLE 있으면 DB upsert)
bun workers/ingest/run.ts promo-etl [--dry] [--month 2026-07-01]
# 또는: bun run ingest:promo

# 교통안전공단 신규등록 (키는 .env.local 권장)
# DATA_GO_KR_API_KEY=...
# DATA_GO_KR_SERVICE_URL 생략 시 기본 엔드포인트 사용
bun workers/ingest/run.ts sales-kot --year 2025 --month 11
```

## Catalog sources (키 없음)

| 브랜드 | 방법 | 결과물 |
|--------|------|--------|
| 현대 | `GET .../gw/product/v1/product/car/catalog-price` | 차종별 가격표·카탈로그 PDF URL |
| 기아 | 공개 DAM PDF + `fixtures/kia-pdf-seed.json` | `/content/dam/kwp/.../pdf/{catalog\|price}/` |
| 제네시스 | 다운로드센터 HTML `viewPdf(fileKey,…)` | file_key + POST 다운로드 엔드포인트 메타 |

## Domain → Source map

| 제품 데이터 | 1순위 소스 | 테이블 |
|-------------|------------|--------|
| 카탈로그·트림·MSRP·옵션 | 현대/기아/제네시스 공식 가격표 PDF | `vehicles`, `trims` (`catalog-parse`) |
| 공식 프로모션 | 기아 special-offers (현대·제네시스 후속) | `official_promotions`, `car_profiles.promo_*` |
| 실계약가·시그널 | 유저 계약 공유 + 집계 워커 | `deal_reports` → `price_signals` |
| Brain 피처·타이밍 | 시그널·판매·프로모·페이스리프트 | `car_features_daily` |
| 판매/등록 추이 | KOTSA OpenAPI, KAMA PDF, MOTIE 파일 | `sales_stats` |
| 신차·연식변경 뉴스 | 브랜드 뉴스룸 | `news_items` |
| 세부가격 밴드 (유료) | KAIDA 등록 DB | `sales_stats` / signals |

## Roadmap

1. **Now** — catalog-parse (MSRP) + **promo-etl (기아)** + Brain features
2. **Next** — 현대/제네시스 프로모 · trim_options 정교화 · 제네시스 POST 다운로드
3. **Then** — KOTSA → Timing v2, 뉴스→market_events
4. **License** — KAIDA DB ETL (계약 후)
5. **Never** — 겟차/다나와/엔카 스크래핑

## Env — API 키 목록

| Var | 필수? | Purpose |
|-----|-------|---------|
| `SUPABASE_URL` | DB 쓰기 시 | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 쓰기 시 | master 테이블 write |
| `DATA_GO_KR_API_KEY` | 판매통계 시 | 공공데이터포털 (`.env.local`) |
| `DATA_GO_KR_SERVICE_URL` | 선택 | 기본: `.../newRegistlnfoService_02/getnewRegistlnfoService02` |
| `VITE_ADMIN_EMAILS` | 선택 | 관리자 allowlist |

**불필요:** 현대/기아/제네시스 공식 카탈로그·뉴스 인덱싱.

**계약(키 아님):** KAIDA 등록 DB, Hyundai Developers 파트너.
