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

# OEM 가격표 PDF → 원문 검토용 로컬 JSON (DB 자동 반영 중단)
bun workers/ingest/run.ts catalog-parse [--limit 20] [--brand hyundai]
# 또는: bun run ingest:catalog-parse

# 공식 프로모션 원문 미리보기 — DB 자동 반영 중단
bun workers/ingest/run.ts promo-etl [--dry] [--brand all|kia|hyundai] [--month 2026-07-01]
# 또는: bun run ingest:promo -- --brand hyundai --dry

# Brain P2 학습·평가·알림 큐
bun run ingest:learn -- --dry
bun run ingest:timing-eval -- --dry
bun run ingest:alerts -- --dry

# 알림 이메일 발송 (RESEND_API_KEY 없으면 미리보기 JSON만)
bun run ingest:send-alerts -- --dry
bun run ingest:send-alerts -- --weekly --dry

# 트림만 있는 차종 → car_profiles stub (표본 0, published)
bun run ingest:profiles -- --dry
# 검수용 draft: --draft

# 교통안전공단 신규등록 (키는 .env.local 권장)
# DATA_GO_KR_API_KEY=...
# DATA_GO_KR_SERVICE_URL 생략 시 기본 엔드포인트 사용
bun workers/ingest/run.ts sales-kot --year 2025 --month 11
```

가격 시그널 메일의 큐 생성과 발송은 자료 출처·수신 동의·철회 절차를 검수하는 동안 기본 중단된다. `SIGNALCAR_PRICE_ALERTS_ENABLED=true`가 명시되지 않으면 위 두 명령도 DB에 접속하거나 발송하지 않는다. 과거 대기 큐와 수신자를 확인하기 전에는 플래그를 켜지 않는다.

## GitHub Actions 운영

`.github/workflows/ingest-loop.yml`의 수동 실행은 `loop --dry --no-claim` 미리보기만 수행하고 DB 비밀값을 전달하지 않는다. 예약 실행은 GitHub 변수 `SIGNALCAR_INGEST_ENABLED=true`와 `signalcar-production` 환경의 운영 비밀값이 모두 준비된 경우에만 실행되며, 작업 중 오류가 나면 Action이 실패한다. 현재 워크플로는 GitHub에서 비활성 상태다. [배포 준비 기록](../../docs/product-review/2026-10-03/DEPLOYMENT_PROGRESS.md)의 D-01·D-02 조건과 실제 DB 잡 설정을 확인하기 전에는 다시 켜지 않는다.

## Catalog sources (키 없음)

| 브랜드 | 방법 | 결과물 |
|--------|------|--------|
| 현대 | `GET .../gw/product/v1/product/car/catalog-price` | 차종별 가격표·카탈로그 PDF URL |
| 기아 | 공개 DAM PDF + `fixtures/kia-pdf-seed.json` | `/content/dam/kwp/.../pdf/{catalog\|price}/` |
| 제네시스 | 다운로드센터 HTML `viewPdf(fileKey,…)` | file_key + POST 다운로드 엔드포인트 메타 |

## Domain → Source map

| 제품 데이터 | 1순위 소스 | 테이블 |
|-------------|------------|--------|
| 가격표 원문 미리보기 | 현대/기아/제네시스 공식 가격표 PDF | 로컬 `workers/ingest/out` JSON. 트림·가격 원문 검토 전 DB 자동 반영 중단 |
| 프로모션 원문 미리보기 | 기아 special-offers·현대 monthly-benefit | 로컬 `workers/ingest/out` JSON. 조건·트림 검증 전에는 DB 자동 반영 중단 |
| 실계약가·시그널 | 유저 계약 공유 + 집계 워커 | `deal_reports` → `price_signals` |
| Brain 피처·타이밍 | 검증 정가·계약 시그널·판매·페이스리프트 | `car_features_daily` |
| 판매/등록 추이 | KOTSA OpenAPI, KAMA PDF, MOTIE 파일 | `sales_stats` |
| 신차·연식변경 뉴스 | 브랜드 뉴스룸 | `news_items` |
| 세부가격 밴드 (유료) | KAIDA 등록 DB | `sales_stats` / signals |

## Roadmap

1. **Now** — 가격표·프로모션은 원문 미리보기만 허용. 운영 수집 전체는 배포 관문 확인 전까지 재개하지 않음
2. **Next** — 현대/제네시스 프로모 · 알림 메일 발송 · trim_options
3. **Then** — 뉴스→market_events · KAIDA
4. **License** — KAIDA DB ETL (계약 후)
5. **Never** — 겟차/다나와/엔카 스크래핑

## Env — API 키 목록

| Var | 필수? | Purpose |
|-----|-------|---------|
| `SUPABASE_URL` | DB 쓰기 시 | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 쓰기 시 | master 테이블 write |
| `SIGNALCAR_PRICE_ALERTS_ENABLED` | 알림 재개 시 | 기본 중단. 출처·동의·철회·대기 큐 검수 후에만 `true` |
| `DATA_GO_KR_API_KEY` | 판매통계 시 | 공공데이터포털 (`.env.local`) |
| `DATA_GO_KR_SERVICE_URL` | 선택 | 기본: `.../newRegistlnfoService_02/getnewRegistlnfoService02` |

**불필요:** 현대/기아/제네시스 공식 카탈로그·뉴스 인덱싱.

**계약(키 아님):** KAIDA 등록 DB, Hyundai Developers 파트너.
