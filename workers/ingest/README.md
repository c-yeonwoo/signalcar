# SignalCar Data Ingest

정책: **경쟁사(겟차·다나와·엔카) 크롤링 금지**.  
허용: 공식 제조사 공개 자료 · 공공 OpenAPI · 1st-party(`deal_reports`) · 유료 라이선스(KAIDA 등).

## Quick start

```bash
# 수집 루트 전체 목록
bun workers/ingest/run.ts sources

# 공식 카탈로그 PDF URL 인덱싱 (현대·기아·제네시스)
bun workers/ingest/run.ts catalog-index

# deal_reports → price_signals 집계 (SERVICE_ROLE 필요)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  bun workers/ingest/run.ts aggregate-signals [--dry]

# 교통안전공단 신규등록 (키 필요)
DATA_GO_KR_API_KEY=... DATA_GO_KR_SERVICE_URL=... \
  bun workers/ingest/run.ts sales-kot --year 2026 --month 06
```

## Domain → Source map

| 제품 데이터 | 1순위 소스 | 테이블 |
|-------------|------------|--------|
| 카탈로그·트림·MSRP·옵션 | 현대/기아/제네시스/르노/KGM 공식 가격표 PDF | `vehicles`, `trims`, `trim_options` |
| 공식 프로모션 | 브랜드 스페셜오퍼·구매혜택 페이지 | `official_promotions` |
| 실계약가·시그널 | 유저 계약 공유 + 집계 워커 | `deal_reports` → `price_signals` |
| 판매/등록 추이 | KOTSA OpenAPI, KAMA PDF, MOTIE 파일 | `sales_stats` |
| 신차·연식변경 뉴스 | 브랜드 뉴스룸 | `news_items` (TBD) |
| 세부가격 밴드 (유료) | KAIDA 등록 DB | `sales_stats` / signals |

## Roadmap

1. **Now** — source registry + catalog PDF index + signal aggregate
2. **Next** — PDF 가격표 파서 (트림·옵션 테이블 자동 upsert) + `slug` 매핑
3. **Then** — KOTSA → `sales_stats` 적재, 뉴스룸 인제스트
4. **License** — KAIDA DB ETL (계약 후)
5. **Never** — 겟차/다나와/엔카 스크래핑

## Env

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | write to master tables |
| `DATA_GO_KR_API_KEY` | 공공데이터포털 |
| `DATA_GO_KR_SERVICE_URL` | KOTSA 신규등록 서비스 URL |
