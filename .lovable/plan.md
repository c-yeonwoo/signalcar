# 신차 구매 코치 — 스프린트 1: 카탈로그 관리 UI

## 목표
브랜드/차종/트림/옵션/공식 프로모션을 사람이 손으로 등록·수정할 수 있는 **관리자 카탈로그 UI**를 먼저 만든다. 소비자 화면·LLM·OCR·인증은 다음 스프린트로 미룬다. 인증은 붙이지 않는다 (오픈).

## 스코프 (이번 스프린트)
포함:
- Lovable Cloud (Postgres) 활성화 및 카탈로그 스키마
- 4개 관리 화면: 브랜드, 차종(모델), 트림, 공식 프로모션
- 카탈로그 트리 탐색 (브랜드 → 차종 → 트림 → 옵션·프로모션)
- 실계약가 제보(`deal_reports`) 스키마는 만들되 UI는 조회만 (읽기 리스트 페이지 1개)

제외 (다음 스프린트):
- OCR / LLM 협상 브리핑 / 견적 진단
- 소비자용 탐색 UI, 타이밍 시그널, 가격 히스토리 차트
- 로그인/인증, give-to-get 루프
- 크롤러·배치 파이프라인 (수집기)

## 데이터 모델 (Postgres, 스펙 초안 반영)

```text
brands           id, name(kr), name_en, country, logo_url, created_at
vehicles         id, brand_id(FK), model_name, generation, body_type,
                 fuel_type, launched_at, discontinued_at, notes
trims            id, vehicle_id(FK), name, base_price, released_at,
                 discontinued_at, notes
trim_options     id, trim_id(FK), category(외장/내장/편의/안전/파워트레인),
                 name, price, is_default, notes
official_promotions
                 id, trim_id(FK), month(date), discount_type(현금/금융/기타),
                 amount, description, source_url, captured_at
deal_reports     id, trim_id(FK), contract_price, list_price,
                 discount_amount, options_taken(jsonb),
                 finance_type, region, contract_month,
                 source(manual/receipt_ocr/community),
                 verification_status(unverified/receipt_verified/flagged),
                 created_at
```

노트:
- 인증이 없으므로 `user_id`는 이번 스프린트에서 뺀다 (다음 스프린트에서 추가).
- `body_type`, `fuel_type`, `finance_type` 등은 자유 텍스트 대신 Postgres enum으로 고정 → 카탈로그 일관성.
- RLS: 인증 없음 방침이라 초기엔 anon에게 SELECT/INSERT/UPDATE/DELETE 허용 (관리자용 프리뷰 목적). 프로덕션 진입 시 관리자 role 게이팅으로 교체할 것을 코드에 TODO 주석으로 남긴다.

## 라우트 구성 (TanStack Start)

```text
src/routes/
  index.tsx                         → 카탈로그 개요 대시보드 (건수/최근 등록)
  admin.brands.tsx                  → 브랜드 목록 + 추가/편집
  admin.vehicles.tsx                → 차종 목록 (브랜드 필터)
  admin.vehicles.$vehicleId.tsx     → 차종 상세: 트림 리스트, 옵션 편집
  admin.trims.$trimId.tsx           → 트림 상세: 옵션 + 공식 프로모션 관리
  admin.promotions.tsx              → 이번 달 공식 프로모션 전체 뷰
  admin.deal-reports.tsx            → 실계약가 제보 조회 (읽기 전용)
```

## UI 컴포넌트
- shadcn `Table`, `Dialog`(추가/편집 모달), `Form` + `zod`, `Select`, `Badge`
- 좌측 shadcn `Sidebar`로 관리 메뉴 (Brands / Vehicles / Promotions / Deal Reports)
- 카탈로그 특성상 밀도 높은 데이터 테이블 위주. 화려한 랜딩 디자인 아님.

## 데이터 연동
- Supabase 브라우저 클라이언트로 직접 CRUD (인증 없음 방침).
- 초기 시드로 국내 5대 브랜드(현대/기아/제네시스/KG/르노) 정도만 브랜드 테이블에 INSERT.
- 차종·트림·프로모션은 사용자가 UI에서 직접 입력.

## 가드레일 준수 (스펙 2번)
- 경쟁사(겟차/다나와/엔카) 데이터를 시드/샘플에도 넣지 않는다.
- 예시 데이터가 필요하면 제조사 공식 사이트에서 확인 가능한 사실 정보(브랜드명, 대표 모델명)만 사용.
- `deal_reports` 시드는 넣지 않음 — 화면은 빈 상태(empty state)로 시작.

## 이번 스프린트에서 결정 보류
- 세그먼트 좁힘 (사용자 나중에 결정) → 카탈로그는 전 차종 수용 가능하도록 설계
- 인증/역할 → 다음 스프린트

## 산출물
1. Lovable Cloud 활성화 + 마이그레이션 (스키마 + enum + GRANT + 임시 anon 정책 + TODO 주석)
2. 브랜드 시드 마이그레이션 (5개 브랜드만)
3. 관리 화면 6개 라우트 + 사이드바 레이아웃
4. `__root.tsx` head 메타 실제 제목/설명으로 교체 ("신차 구매 코치 — 카탈로그 관리")
