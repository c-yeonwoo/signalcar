# 신차 구매 코치 — 소비자 모바일 웹앱 (재정의)

## 방향 전환
직전 스프린트에서 만든 브랜드/차종 CRUD 화면은 **관리자 도구**였습니다. 사용자가 만들고자 하는 건 "차 살 때 옆에 있어주는, 차 잘 아는 친구" 같은 **소비자 대면 모바일 웹앱**입니다. 어드민을 지우진 않고 `/admin/*`로 격리하고, 루트(`/`)부터는 소비자 경험으로 완전히 재구축합니다.

## 디자인 방향
- **모바일 프레임**: 최대 폭 480px 중앙 정렬. 데스크톱에서도 좌우 여백에 은은한 배경, 가운데 모바일 캔버스.
- **컬러**:
  - 배경 `#F7F8FA`, 카드 white + soft shadow, radius 16px
  - 딥 네이비 `#12203A`, 포인트 블루 `#2E6BFF`
  - 시그널: 그린 `#16A34A` (살 때), 앰버 `#F59E0B` (기다려), 그레이 (중립)
- **타이포**: Pretendard (CDN link) → fallback system-ui. 큰 헤드라인, 여백 넉넉, 한 화면 = 핵심 하나.
- **컴포넌트**: 라운드 카드, pill 뱃지, 세그먼트 컨트롤, 하단 고정 CTA, 하단 탭바.
- **금지**: 데이터 테이블, 촘촘한 보더, 편집 아이콘, CRUD 버튼, 관리자 사이드바.

## 라우트 구조
```
/                    → 홈 (타이밍 시그널 피드)
/car/$vehicleId      → 차종 상세 ("지금 살 때인가?")
/coach               → 협상 브리핑 (대화형)
/diagnose            → 견적서 진단 (사진 업로드)
/report              → 실계약가 제보 (give-to-get)
/me                  → 마이 (placeholder)
/admin               → 기존 어드민 대시보드 (격리)
/admin/brands, /admin/vehicles, /admin/vehicles/$id, /admin/promotions, /admin/deal-reports
```
- 루트 레이아웃: 모바일 프레임 + 하단 탭바 (홈/코치/제보/마이). `/admin/*`는 별도 레이아웃(사이드바) 유지.
- 사이드바/`AppSidebar`는 어드민 전용으로만 사용, 소비자 화면에서 제거.

## 화면별 스펙

### 1. 홈 `/`
- 상단 그리팅: "안녕하세요 👋 어떤 차 보고 계세요?" + "+ 관심 차종" 버튼
- 관심 차종 카드 (mock 3개: 그랑콜레오스 / 싼타페 / 쏘렌토):
  - 차명·트림, 실거래가 중앙값 (`₩3,120만 · 제보 47건`)
  - 시그널 뱃지 (🟢/🟡/⚪) + 한 줄 코칭
  - 미니 스파크라인 (6개월 실거래가, SVG 자체 구현)
- 하단 탭바

### 2. 차종 상세 `/car/$vehicleId`
- 히어로: 큰 verdict ("지금 사도 좋아요") + 신뢰도 배지
- 카드: 실거래가 분포(중앙/최저/최고 + 표본수), 이번 달 프로모션, percentile 게이지, 연식변경 타임라인
- 하단 고정 CTA "협상 브리핑 받기" → `/coach?vehicle=...`

### 3. 협상 브리핑 `/coach`
- 스텝: 트림/옵션/지역/예산 (칩+세그먼트)
- 결과: 채팅 버블/코치 카드
  - 적정가 밴드
  - 딜러 첫 제시 예상
  - "이렇게 받아치세요" 스크립트 (복사 버튼)
  - 옵션→현금할인 전환 팁
  - 금융 함정 체크리스트
- 표본 부족 시 정직한 표시

### 4. 견적서 진단 `/diagnose`
- 드롭존 (파일 선택 UI만, 실제 파싱은 다음 스프린트)
- 결과 카드: 상/중/하 뱃지 + 코멘트 mock

### 5. 제보 `/report`
- give-to-get 카피
- 사진 업로드 → mock 파싱값 확인 폼 (트림/할인액/월/지역/금융)
- 개인정보 안심 문구

### 6. 마이 `/me`
- 출고 트래킹 placeholder, "곧 만나요" 카드

### 7. 어드민 `/admin/*`
- 기존 `brands.tsx`, `vehicles.tsx`, `vehicles.$vehicleId.tsx`, `promotions.tsx`, `deal-reports.tsx`를 `admin.*` 접두어로 이동
- `admin` 레이아웃 라우트에 사이드바 유지, 소비자 UI와 분리

## 데이터 전략
- MVP는 **mock 데이터**로 생생하게 채움 (요구사항 명시). 실제 Supabase 연동은 홈 카드/상세만 부분 연결하되, mock fallback 유지.
- 시그널·시세 계산 로직은 `src/lib/mock-signals.ts`에 순수 함수로 (트림별 시세, 프로모션 percentile, verdict 계산).
- 스파크라인은 외부 차트 라이브러리 없이 SVG로 직접 그리기 (모바일 성능 + 룩 컨트롤).

## 기술 세부
- 루트 `__root.tsx`: `SidebarProvider` 제거, 모바일 프레임 shell만. 어드민은 `/admin` 레이아웃 라우트에서 자체 sidebar.
- Pretendard: `__root.tsx` head에 `<link>`로 로드 (Tailwind v4 규칙 준수, `@import` URL 금지).
- `styles.css`의 `@theme`에 새 컬러 토큰(`--color-signal-buy`, `--color-signal-wait`, `--color-brand-navy` 등) + `--font-sans: "Pretendard Variable"` 추가.
- 컴포넌트: `MobileFrame`, `BottomTabBar`, `SignalBadge`, `Sparkline`, `SectionCard`, `ChatBubble`, `Stepper` 등 신규.
- Motion for React로 카드 페이드/스프링 (과하지 않게 진입시 1회).

## 어드민 마이그레이션
현재 파일들을 이동:
- `src/routes/index.tsx` → 소비자 홈으로 완전 교체 (기존 대시보드는 `/admin`로)
- `src/routes/brands.tsx` → `src/routes/admin.brands.tsx`
- `src/routes/vehicles.tsx` → `src/routes/admin.vehicles.tsx`
- `src/routes/vehicles.$vehicleId.tsx` → `src/routes/admin.vehicles.$vehicleId.tsx`
- `src/routes/promotions.tsx` → `src/routes/admin.promotions.tsx`
- `src/routes/deal-reports.tsx` → `src/routes/admin.deal-reports.tsx`
- `src/routes/admin.tsx` (레이아웃): 사이드바 + `<Outlet />`
- `src/routes/admin.index.tsx`: 어드민 대시보드 (기존 index 내용)

## 이번 스프린트 산출물
1. 라우트 재편성 + 어드민 격리
2. 모바일 프레임/탭바/디자인 토큰
3. 홈, 차종 상세, 협상 브리핑, 견적 진단, 제보, 마이 6개 소비자 화면
4. Mock 데이터 & 시그널 계산 유틸
5. Pretendard 로드, 컬러 토큰, SVG 스파크라인

다음 스프린트로 미룸: 실제 사진 OCR, LLM 코칭, 실거래가 DB 연결 강화, 인증/give-to-get 게이팅.
