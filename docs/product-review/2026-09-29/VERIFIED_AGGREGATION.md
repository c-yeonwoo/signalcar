# SC-012 선행 수정 · 검증 제보만 신규 집계

2026-09-29: `aggregate-signals`와 `car-features`의 신규 제보 조회를 `receipt_verified`로 제한했다. `unverified`와 `flagged`는 제외한다. 월·트림을 나눈 양수 가격만 집계하고, 표본 수만으로 BUY 판정을 만들던 중복 코드를 제거했다. [집계 테스트](/Users/ys.choi/dev-private/signalcar/workers/ingest/pipelines/aggregate-signals.test.ts)는 검증 여부·잘못된 값·월/트림 분리를 확인한다.

이는 **앞으로 워커가 실행될 때의 필터**다. 이미 `price_signals`에 남은 예시 행·과거 집계 행이 정정되거나, 운영에 배포된 워커가 교체되었다는 증거는 아니다. 기존 행에는 원천·검증 상태가 없고, 동일 계약의 중복 신고 판별 키와 관측 분위수 저장도 아직 없다. SC-010의 읽기 전용 운영 감사·백업·정정 승인과 SC-011의 가격 출처/표시 계약이 준비된 뒤에 기존 행 격리와 재집계를 완료한다. 그 전에는 SC-012를 완료 처리하지 않는다.
