# 현재 제품 진단과 재현 근거

점검일: 2026-09-29 · 코드 기준: HEAD 7484d9b 및 현재 작업 트리 · [전략 리포트](./REPORT.md) · [작업 목록](./BACKLOG.md)

작업 시작 때부터 src/routeTree.gen.ts에 기존 변경이 있었다. 해당 파일의 변경을 되돌리지 않았다. 이번 진단은 코드·마이그레이션의 정적 검토와 일부 로컬 화면 관찰이며, 운영 DB에 대한 보안·데이터 감사 완료를 의미하지 않는다.

## 유지할 기반

- 카탈로그는 car_profiles·trims·vehicles·brands·price_signals를 조회하는 DB 기반 구조다. 파일 이름이 mock-cars라는 이유로 전체가 목업이라고 판단하면 안 된다.
- 공식 제조사 자료 인덱싱·가격표 파싱·프로모션 수집·운영 화면이 존재한다.
- 관심차·비교·알림·추천·견적 접수·계약 공유의 화면 기반이 있다.
- Supabase 인증, 사용자 소유 데이터 RLS, private 견적 파일 경로 규칙 등 보호 장치의 기반은 있다. 실제 정책 조합과 배포 상태의 검증이 추가로 필요하다.
- 추천·가격·타이밍 계산이 모듈화되어 있어 구조 전체를 교체하기보다 데이터 의미와 검증 순서를 바로잡을 수 있다.

## 우선 발견사항

### A01 · P0 · 본인 프로필 수정 권한과 관리자 플래그의 결합

**관찰:** 초기 마이그레이션은 authenticated에 profiles 전체 UPDATE 권한을 주고, 자신의 행을 수정할 수 있도록 한다. 후속 마이그레이션은 같은 테이블에 is_admin을 추가하고 이를 관리자 정책의 근거로 쓴다. 읽은 마이그레이션에서 해당 열 수정 권한을 제한하는 보완은 찾지 못했다.

**영향:** 이 마이그레이션 조합대로 배포됐다면 일반 사용자가 본인 관리자 플래그를 변경해 관리 데이터에 접근할 가능성이 있다. 프런트 이메일 목록으로는 서버 권한을 보호할 수 없다. /admin의 allowlist 미설정 시 모든 로그인 사용자를 통과시키는 동작도 별도로 존재한다.

**근거:** [profiles 권한](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260711005231_8aa3f22d-80b4-467c-9fdd-0a2077d09155.sql:39), [is_admin와 관리자 정책](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260715010000_real_catalog.sql:42), [관리 화면 입구](/Users/ys.choi/dev-private/signalcar/src/routes/admin.tsx:29)

**조치/검증:** 서버만 수정 가능한 역할 테이블 또는 열 권한 분리. 테이블 전체 UPDATE 권한이 남아 있으면 열 제한만으로 보호되지 않는다는 [Supabase 공식 설명](https://supabase.com/docs/guides/database/postgres/column-level-security)을 함께 적용한다. 격리 DB에 전체 마이그레이션 적용 후 일반 계정의 권한 변경/관리 쓰기 실패와 관리자 성공을 확인한다. 운영에서 실제 악용됐다는 증거는 확보하지 않았다. 작업 SC-009.

### A02 · P0 · 정가와 실거래 관측값의 혼용

**관찰:** 최신 중앙값이 없으면 listPrice를 medianContract에 넣는다. 홈·비교는 이 필드를 ‘실거래가 중앙값’으로 표시한다.

**영향:** 정가만 있는 차량에 실거래 가격이 존재하는 것처럼 보일 수 있다. 표본 수 0 표시가 있어도 금액의 잘못된 의미가 해소되지는 않는다.

**근거:** [가격 매핑](/Users/ys.choi/dev-private/signalcar/src/lib/cars.ts:82), [홈 표시](/Users/ys.choi/dev-private/signalcar/src/routes/index.tsx:430), [비교 표시](/Users/ys.choi/dev-private/signalcar/src/routes/compare.tsx:149)

**조치/검증:** 표시 타입을 분리하고 데이터 없는 관측값은 null 유지. 표본 없는 테스트 차량에서 모든 화면이 공식 가격으로 표시되는지 확인. 작업 SC-011.

### A03 · P0 · 실거래 범위와 협상 목표의 근거 부족

**관찰:** minContract/maxContract는 관측 분포가 아니라 중앙값의 4% 또는 최소 40만원 폭으로 만든다. 협상 스크립트는 이를 분위수 입력으로 전달하고, 딜러 혜택이 없으면 정가의 1.5%를 재량 추정의 기반으로 사용한다.

**영향:** 개인의 계약 협상에 사용될 수치가 관측 통계처럼 전달될 수 있다. ‘추정’ 표시는 일부 있으나 실거래 밴드와 구분이 일관되지 않다.

**근거:** [범위 생성](/Users/ys.choi/dev-private/signalcar/src/lib/cars.ts:83), [협상 계산](/Users/ys.choi/dev-private/signalcar/src/lib/negotiation-brief.ts:32), [가격 함수](/Users/ys.choi/dev-private/signalcar/src/lib/brain/price.ts:23)

**조치/검증:** 관측 분위수와 추정 시나리오를 분리. 근거가 없을 때 숫자 협상 목표 대신 확인 질문을 제공한다. 함수의 정가×0.95 fallback은 코드에 존재하지만 현재 모든 화면이 그 경로를 사용한다고 단정하지 않는다. 작업 SC-011,012,024.

### A04 · P0 · 검증되지 않은 제보가 가격 통계에 포함될 수 있음

**관찰:** aggregate-signals는 verification_status가 flagged가 아닌 제보를 읽는다. 따라서 unverified도 포함된다. 가격 비교 조건은 trim_id와 월 중심이다.

**영향:** 표본 수가 증가해도 같은 조건의 검증된 거래가 증가했다고 볼 수 없다. 옵션·금융·중복·취소 등이 섞이면 중앙값과 타이밍 모두 왜곡된다.

**근거:** [집계 필터](/Users/ys.choi/dev-private/signalcar/workers/ingest/pipelines/aggregate-signals.ts:49), [제보 입력 정책](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260711005231_8aa3f22d-80b4-467c-9fdd-0a2077d09155.sql:176)

**조치/검증:** 검증 상태를 명시적으로 포함하는 집계, 같은 거래 식별·취소 제외·구성 정규화, 표본 수와 유효 표본 수 분리. 작업 SC-012,020.

### A05 · P0 · 예시 표본과 가격 이력이 DB 마이그레이션에 포함

**관찰:** Gate0와 real_catalog 마이그레이션은 구체적인 중앙값·표본 수·매수/대기 시그널과 과거 월별 이력을 삽입한다. 해당 행이 사용자 계약에서 산출됐다는 연결은 이 SQL 자체에 없다.

**영향:** 운영에 그대로 적용되고 남아 있다면 ‘표본 15건 이상’ 같은 신뢰 게이트를 예시 데이터가 통과할 수 있다.

**근거:** [Gate0 시드](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260714120000_gate0_trust_threshold.sql:51), [추가 시드/히스토리](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260715010000_real_catalog.sql:149)

**조치/검증:** 운영 데이터 계보 확인·테스트 시드 분리·검수된 정정. 현재 운영에 해당 수치가 노출되고 있다고 확인한 것은 아니다. 작업 SC-010.

### A06 · P0 · 개인정보 처리방침의 약속과 업로드 경로 불일치

**관찰:** 개인정보 처리방침은 개인 식별정보를 마스킹해 저장한다고 설명한다. 읽은 diagnose/report 클라이언트는 사용자가 선택한 파일을 바로 Storage에 올린다. 별도 가림·확인 단계는 찾지 못했다. 문의 주소는 example 도메인이다.

**영향:** 실제 동작보다 강한 보호 약속을 할 수 있다. private Storage 접근 정책은 원본에서 개인정보가 제거됐다는 뜻이 아니다.

**근거:** [업로드](/Users/ys.choi/dev-private/signalcar/src/routes/diagnose.tsx:41), [계약 업로드](/Users/ys.choi/dev-private/signalcar/src/routes/report.tsx:63), [처리방침](/Users/ys.choi/dev-private/signalcar/src/routes/privacy.tsx:31)

**조치/검증:** 직접 입력 또는 가림 완료 파일을 기본 경로로 제공, 원본 필요성·접근·외부 처리·보관·삭제를 실제 동작과 맞춘다. 외부 워커의 후처리 여부는 미확인이다. 작업 SC-014,015.

### A07 · P0 · 진단 서비스의 완료·복구 경로 확인 필요

**관찰:** quote_diagnoses 행 생성과 realtime UPDATE 구독은 있다. 저장소 내 workers/ingest 목록에서는 진단을 처리하는 워커를 찾지 못했다. failed 상태 타입은 있으나 해당 오류 결과 UI가 없다. ‘1~2분’ 완료 문구, 파일 선택 후 나타나는 예시 결과, 5MB 안내가 있다.

**영향:** 외부 처리기가 없거나 실패하면 접수 이후 멈출 수 있다. 페이지 새로고침 후 요청 ID를 복원하는 코드도 이 화면에는 없다. 예시 결과가 실제 업로드 내용에 대한 판단으로 오인될 여지가 있다.

**근거:** [접수·구독·상태](/Users/ys.choi/dev-private/signalcar/src/routes/diagnose.tsx:31), [시간 약속](/Users/ys.choi/dev-private/signalcar/src/routes/diagnose.tsx:147)

**조치/검증:** 외부 배포/큐 확인, 없으면 수동 검토로 운영 약속 변경. 입력·검수·실패·재시도·요청 복원 검증. 서버 파일 제한도 별도 확인하며 UI 문구만으로 5MB 제한이 구현됐다고 보지 않는다. 작업 SC-014,016,025,036.

### A08 · P1 · 제보 파일과 거래 행의 연결·트림 식별 문제

**관찰:** report는 실시간 차량 목록을 보여주지만 제출 시 고정 TRIM_ID_MAP만 사용한다. 업로드 rawPath는 거래 INSERT에 전달되지 않으며, 이미지가 있으면 실제 OCR 수행 여부와 무관하게 source를 receipt_ocr로 적는다. 계약가를 정가−입력 할인으로 만든다.

**영향:** 동적으로 추가된 트림은 제출에 실패할 수 있고, 파일을 올렸다는 사실과 검증된 OCR 결과가 혼동된다. 옵션·부대비용이 포함된 실제 견적을 비교 가능한 가격으로 정규화하기 어렵다.

**근거:** [제출 로직](/Users/ys.choi/dev-private/signalcar/src/routes/report.tsx:54), [계약 가격·source](/Users/ys.choi/dev-private/signalcar/src/routes/report.tsx:75)

**조치/검증:** live trimId, 서버 업로드 세션/문서 ID, 검수 상태와 추출 방법 분리, 사용자가 확인한 구성별 금액 저장. 외부 Storage 이벤트 연결은 미확인이다. 작업 SC-020,025.

### A09 · P1 · 상대 점수를 적합성 확률처럼 읽을 수 있음

**관찰:** normalizedMatch는 후보의 상대 점수를 60~99로 변환한다. 예산 불일치는 감점이고, 5명 이상은 차체 문자열에 따른 가점이다. 실제 좌석·총예산을 강제하는 구조가 아니다.

**영향:** 부적합 후보 중 가장 높은 후보도 높은 적합도로 보일 수 있다. 데이터 커버리지가 좁을수록 점수는 오해를 키운다.

**근거:** [가중 점수](/Users/ys.choi/dev-private/signalcar/src/lib/brain/match.ts:33), [상대 정규화](/Users/ys.choi/dev-private/signalcar/src/lib/brain/match.ts:119)

**조치/검증:** 필수 조건 필터, 미확인 속성 분리, 추천 거부·조건 조정, 이유/타협 제공. 작업 SC-022,031.

### A10 · P1 · 첫 질문·홈·상담의 기준이 다름

**관찰:** 첫 방문에 5단계 모달이 자동으로 열린다. 홈은 용도와 시그널의 간단한 정렬을 사용한다. 추천 상담에는 별도 6문항과 다른 예산 구간이 있다. 추천 상담 state는 빈 answers로 시작한다.

**영향:** 같은 사람의 답변이 서비스 전체의 일관된 구매 기준으로 보존되지 않는다. 아직 차를 정하지 않은 홈 사용자에게 옵션 상담 CTA가 먼저 노출된다.

**근거:** [자동 모달](/Users/ys.choi/dev-private/signalcar/src/components/onboarding-modal.tsx:72), [홈 추천](/Users/ys.choi/dev-private/signalcar/src/routes/index.tsx:79), [상담 상태](/Users/ys.choi/dev-private/signalcar/src/routes/coach.match.tsx:197)

**조치/검증:** 공통 구매 프로젝트, 진입 단계에 맞는 CTA, 이미 답한 내용 재사용, 질문 생략·수정. 작업 SC-027,029,030.

### A11 · P1 · 차량별 실제 옵션과 공통 옵션 사전이 다름

**관찰:** 옵션 상담은 공통 OPTION_CATALOG의 가격과 이유를 사용하고 합산한다. 실제 기본 포함·선택 패키지·선행 옵션 관계와 연결돼 있지 않다.

**영향:** 차량에서 고를 수 없는 옵션이나 기본 포함 항목을 추가 비용으로 제안할 수 있다. 일부 이유의 재판매 가치 등도 근거가 필요하다.

**근거:** [공통 옵션 사전](/Users/ys.choi/dev-private/signalcar/src/routes/coach.options.tsx:140), [가격 합산](/Users/ys.choi/dev-private/signalcar/src/routes/coach.options.tsx:223)

**조치/검증:** 12~18개 구성부터 정확한 호환과 가격 검수. 미지원 차에는 금액 없는 확인 안내. 작업 SC-023.

### A12 · P1 · 시간 단위·갱신 기준의 부정확한 표현

**관찰:** cars는 월별 price_signals 최근 6개를 history에 넣는다. weeklyChangeFor는 마지막 두 값을 비교해 ‘이번주’라고 표시한다. 프로모션 갱신 여부도 변경 시각이 아니라 금액/백분위 조건으로 판단한다. 홈과 제보 월은 2026-07이 고정돼 있다.

**영향:** 월간 차이와 주간 변화, 큰 혜택과 새롭게 바뀐 혜택을 혼동한다.

**근거:** [월별 이력](/Users/ys.choi/dev-private/signalcar/src/lib/cars.ts:68), [주간 표기](/Users/ys.choi/dev-private/signalcar/src/lib/mock-cars.ts:363), [고정 월](/Users/ys.choi/dev-private/signalcar/src/routes/report.tsx:43)

**조치/검증:** 관측 기간·실제 비교 시점·source version 포함, 변경 감지의 정의 분리. 작업 SC-018,021,045.

### A13 · P1 · 비용의 범위와 추정 전제 보강 필요

**관찰:** estimateOwnership은 연료·보험·정비를 계산한다. 유가/충전 단가와 정비율은 고정 가정이다. cars의 연비·보험 누락값에는 기본값이 들어간다. new-vs-used는 차체 종류별 잔가율에서 1/3년 중고 가격을 추정한다.

**영향:** 일부 유지비를 전체 월 부담으로 읽거나 단순 잔가 가정을 시장 시세로 해석할 수 있다. 원금·이자·세금·주차 등까지 별도로 설명해야 한다.

**근거:** [비용 추정](/Users/ys.choi/dev-private/signalcar/src/lib/mock-cars.ts:341), [기본값](/Users/ys.choi/dev-private/signalcar/src/lib/cars.ts:114), [신차/중고 추정](/Users/ys.choi/dev-private/signalcar/src/lib/new-vs-used.ts:28)

**조치/검증:** 월 현금흐름·총보유비용·추정 잔가 분리, 입력/가정 수정, 민감도 표시. 작업 SC-024.

### A14 · P1 · 열람권 처리의 서버와 클라이언트 불일치

**관찰:** 로컬 잔액 차감과 unlock을 기록하고 서버 RPC를 비동기로 호출한다. 서버 실패 시 경고를 남기지만 로컬 성공을 되돌리지 않는다. RPC는 제보 수−사용 수를 조회하고 다른 trim의 unlock을 삽입한다.

**영향:** 잔액·권한이 기기/계정/서버와 불일치할 수 있다. RPC의 동시 요청과 검증 전 제보 보상에 대한 추가 보호가 필요하다. 이를 실제 결제 우회가 확인됐다고 표현하지 않는다.

**근거:** [선처리](/Users/ys.choi/dev-private/signalcar/src/lib/report-credits.ts:83), [RPC](/Users/ys.choi/dev-private/signalcar/supabase/migrations/20260714120000_gate0_trust_threshold.sql:71)

**조치/검증:** 서버 장부·원자적 처리·idempotency·사용자별 로컬 캐시 분리. 작업 SC-017,040.

### A15 · P1 · 화면이 오류 상태를 검색 결과 없음으로 숨김

**관찰:** DB 오류 또는 빈 profiles를 같은 빈 배열로 반환한다. 로컬 홈은 추천 0대, 탐색은 전체 필터에서도 ‘필터를 완화’ 안내를 표시했다.

**영향:** 사용자는 자신의 입력이 문제라고 생각하며 실제 복구 방법을 얻지 못한다.

**근거:** [오류/빈 배열 처리](/Users/ys.choi/dev-private/signalcar/src/lib/cars.ts:145), 로컬 브라우저 2026-09-29 관찰.

**조치/검증:** 데이터 없음과 장애·권한/연결 오류를 구분. 운영 카탈로그가 실제 비었다는 결론은 내리지 않았다. 작업 SC-013.

### A16 · P1 · 비교·데스크톱·가독성의 제품 목적 불일치

**관찰:** 모든 소비자 화면이 최대 480px이며 데스크톱에 ‘폰으로 열면 편리’ 안내가 있다. 비교는 가격·할인·시그널·표본 중심이다. 10~13px 보조 텍스트가 많이 쓰인다.

**영향:** 부부가 후보를 나란히 보거나 견적 항목을 읽는 고관여 작업에 화면 폭과 정보 구조가 맞지 않는다. 작은 텍스트의 실제 대비/가독성은 추가 측정이 필요하다.

**근거:** [쉘](/Users/ys.choi/dev-private/signalcar/src/components/consumer-shell.tsx:17), [비교](/Users/ys.choi/dev-private/signalcar/src/routes/compare.tsx:149), [스타일](/Users/ys.choi/dev-private/signalcar/src/styles.css:67)

**조치/검증:** 데스크톱 확장, 개인 기준 비교, 읽기 쉬운 크기·필수 항목 강조, 기기별 수동 검증. 작업 SC-028,032,037.

### A17 · P1 · 관찰 이벤트는 있으나 사업 성과 측정은 불완전

**관찰:** outcome_events에 클릭·관심·추천 결과·열람·제보 등을 기록한다. 학습 워커는 관심/취소 등 이벤트로 가중치를 조정한다. session_id는 localStorage에 지속 저장된다.

**영향:** 관심과 실제 구매 만족의 차이가 크며, 노출·프로젝트·외부 행동 완료·정산의 연결 없이는 전환율과 추천 개선을 평가하기 어렵다. 현재 session_id를 방문 세션 수로 그대로 쓰면 안 된다.

**근거:** [이벤트 기록](/Users/ys.choi/dev-private/signalcar/src/lib/brain/outcomes.ts:6), [학습 입력](/Users/ys.choi/dev-private/signalcar/workers/ingest/pipelines/learn-match.ts:41)

**조치/검증:** 프로젝트 기반 퍼널·명시적 event ID·추천 버전·성과 코호트. 자동학습 확대는 유효 표본·오프라인 평가·통제된 실험 뒤에 진행. 작업 SC-046,047,049.

### A18 · P2 · 예시 리뷰 코드의 재노출 방지

**관찰:** mock-cars에는 312/1,128/894개 등 고정 리뷰 요약과 verified 예시가 남아 있다. 차량 상세 파일에는 이를 표시할 수 있는 ReviewsSection 함수가 있으나, 현재 파일에서 호출되는 경로는 찾지 못했다.

**영향:** 현재 노출 문제로 단정할 수는 없다. 향후 화면 개편 때 실제 구매자 데이터로 오인하여 재사용할 위험이 있다.

**근거:** [예시 리뷰](/Users/ys.choi/dev-private/signalcar/src/lib/mock-cars.ts:90), [미사용 리뷰 함수](/Users/ys.choi/dev-private/signalcar/src/routes/car.$vehicleId.tsx:785)

**조치/검증:** 예시 fixture로 분리·샘플 표시·실제 검증 배지 규칙. SC-010,033에서 함께 처리.

### A19 · P1 · 공개 정보·데이터 사용 범위 정리

**관찰:** ingest README와 sources는 경쟁사 데이터를 제품에 적재하지 않는 정책을 명시한다. 개인 조사용 관련 CLI와 파일도 존재한다. 일부 명령은 preview 결과를 src/data에 쓸 수 있다고 안내한다.

**영향:** 조사 자료와 제품 사용 자료의 경계가 흐려질 수 있다. CLI가 있다는 이유로 현재 위반을 단정하지 않으며, 정책을 실제 게시 흐름에서 강제하는지가 점검 대상이다.

**근거:** [수집 정책](/Users/ys.choi/dev-private/signalcar/workers/ingest/README.md:3), [소스 레지스트리](/Users/ys.choi/dev-private/signalcar/workers/ingest/sources.ts:41), [명령 안내](/Users/ys.choi/dev-private/signalcar/workers/ingest/run.ts:82)

**조치/검증:** 출처별 권리·목적 필드, 운영 publish gate, 공식 이미지·문서의 사용 허용 범위 기록. 이번 경쟁 조사도 공개 페이지 열람만으로 수행했고 제품 데이터에 적재하지 않았다. 작업 SC-026.

## 화면 관찰 기록

| 경로 | 확인한 상태 | 관찰 | 한계 |
|---|---|---|---|
| / | 첫 방문·모달 닫은 홈 | 5단계 질문 자동 노출, 추천 0대, 여러 CTA | 운영 데이터 존재 여부 미확인 |
| /explore | 전체 필터·0대 | 차체/연료/예산/시그널 필터, 조건 완화 안내 | 데이터가 있는 목록은 미검증 |
| /coach/match | 첫 문항 | 별도 6문항, 예산부터 시작 | 결과까지 완료하지 않음 |
| /diagnose | 비로그인 진입 | 로그인 게이트 | 업로드·워커·실결과 미검증 |
| 차량 상세·비교·관리 | 코드 중심 | 필드 의미·호출 경로 검토 | 로그인·실데이터 시나리오 미검증 |

개발 서버 로그에는 `[cars] DB load failed or empty TypeError: Failed to fetch`가 남았다. 따라서 0대 화면만으로 실제 DB의 차량 수가 0이라고 결론낼 수 없다. 네트워크·환경 설정·백엔드 응답 확인은 SC-001, 오류와 빈 결과 분리는 SC-013에 포함한다. SSR hydration 경고도 관찰됐으며 표시된 차이는 개발용 `data-tsd-source` 속성의 위치 값이었다. 운영 재현 여부는 확인하지 않았다.

## 빌드·테스트 관찰

| 실행 | 결과 | 의미 |
|---|---|---|
| npm run build | 성공, exit 0 | 프로덕션 산출물 생성 가능 |
| bun test workers/ingest/lib/parse-price-pdf.test.ts | exit 0, 두 PDF 샘플 파싱, 등록 테스트 0개 | 파일 내부 단순 검증을 통과한 스모크 실행 |

빌드 산출물에서 로고 약 420KB, 차량 PNG 약 652~724KB가 관찰됐다. 네트워크 조건과 LCP 등 실제 성능은 측정하지 않았으므로 느리다고 단정하지 않는다. 이미지 최적화·lazy loading·공개 페이지 렌더링은 개편 시 예산을 정해 측정한다.

빌드 경고에는 Node API deprecation과 Vite 경로 플러그인 관련 안내가 있었다. 이번 제품 진단에서 종속성 업데이트나 마이그레이션은 하지 않았다. 핵심 구매·권한·계산·결제 테스트는 향후 구현 작업의 완료 기준에 포함했다.
