import carGrandKoleos from "@/assets/car-grand-koleos.png";
import carSantafe from "@/assets/car-santafe.png";
import carSorento from "@/assets/car-sorento.png";
import danawaGrandeurBenefits from "@/data/danawa-benefits-grandeur.json";

export type Signal = "buy" | "wait" | "neutral";

export type MockCar = {
  id: string;
  brand: string;
  model: string;
  trim: string;
  bodyType: string;
  listPrice: number; // 원
  medianContract: number;
  minContract: number;
  maxContract: number;
  reports: number;
  signal: Signal;
  headline: string;
  coach: string;
  promoPercentile: number; // 0-100 (프로모션 좋음 정도)
  facelift: { month: string; note: string } | null;
  history: number[]; // 최근 6개월 중앙값 (만원 단위 or 원, 상대값만 쓰이므로 상관 없음)
  promoThisMonth: { label: string; amount: number; note: string };
  imageColor: string; // gradient accent
  image?: string; // 없으면 상세에서 gradient placeholder
  fuelType: "gasoline" | "diesel" | "hybrid" | "ev";
  fuelEfficiency: number; // km/L (or km/kWh for EV)
  insuranceAnnual: number; // 30대 남성 기준 예시 (원/년)
  benefits: Benefit[];
  /** 혜택 기준월 (예: 2026-07). 있으면 상세 UI에 표기 */
  benefitsPeriod?: string;
};

export type BenefitCategory =
  | "cash" // 현금 할인
  | "finance" // 저리 할부/리스
  | "card" // 제휴 카드
  | "tradein" // 기변/기존차 보상
  | "loyalty" // 재구매·패밀리
  | "group" // 법인·단체
  | "eco" // 친환경 세제혜택
  | "gift"; // 사은품

export type Benefit = {
  id: string;
  category: BenefitCategory;
  title: string;
  amount: number; // 원 (0이면 비금전 혜택)
  note: string; // 조건·주의
  stackable: boolean; // 다른 혜택과 중복 가능?
  source: "official" | "dealer" | "external"; // 공식/딜러재량/외부
};

export const BENEFIT_META: Record<BenefitCategory, { label: string; code: string }> = {
  cash: { label: "현금 할인", code: "CASH" },
  finance: { label: "저리 할부·리스", code: "FIN" },
  card: { label: "제휴 카드", code: "CARD" },
  tradein: { label: "기변·보상", code: "TRD" },
  loyalty: { label: "재구매·패밀리", code: "LOY" },
  group: { label: "법인·단체", code: "GRP" },
  eco: { label: "친환경 세제혜택", code: "ECO" },
  gift: { label: "사은품", code: "GFT" },
};

export type ReviewSource = "owner" | "media" | "video";

export type ReviewItem = {
  id: string;
  source: ReviewSource;
  author: string;
  rating: number; // 0-5
  date: string; // YYYY-MM
  quote: string;
  ownershipMonths?: number;
  verified?: boolean; // 시그널카 실계약 공유와 매칭됨
  url?: string; // 외부 링크 (미디어/영상)
  channel?: string;
};

export type ReviewBundle = {
  aiSummary: {
    overall: number; // 0-5
    sampleSize: number;
    tldr: string;
    pros: string[];
    cons: string[];
  };
  aspects: { label: string; score: number }[]; // 승차감·연비·인테리어 등
  items: ReviewItem[];
};

const KOLEOS_REVIEWS: ReviewBundle = {
  aiSummary: {
    overall: 4.2,
    sampleSize: 312,
    tldr:
      "가성비와 하이브리드 연비에 만족도가 높은 편. 인포테인먼트 UI와 소프트웨어 완성도에는 아쉬움이 반복적으로 언급돼요.",
    pros: ["동급 대비 넓은 실내", "하이브리드 실연비 만족", "가격 대비 옵션 구성"],
    cons: ["인포테인먼트 반응 속도", "서비스망 접근성", "초기 소프트웨어 이슈"],
  },
  aspects: [
    { label: "승차감", score: 4.1 },
    { label: "연비", score: 4.5 },
    { label: "인테리어", score: 4.0 },
    { label: "정숙성", score: 3.8 },
    { label: "인포테인먼트", score: 3.2 },
    { label: "서비스망", score: 3.4 },
  ],
  items: [
    {
      id: "gk-r1",
      source: "owner",
      author: "서울 · 30대 오너",
      rating: 5,
      date: "2026-05",
      ownershipMonths: 3,
      verified: true,
      quote:
        "고속에서 17km/L 넘게 나와서 놀랐어요. 인테리어는 사진보다 실물이 훨씬 낫습니다. 다만 내비 반응이 살짝 굼떠요.",
    },
    {
      id: "gk-r2",
      source: "owner",
      author: "경기 · 40대 오너",
      rating: 4,
      date: "2026-04",
      ownershipMonths: 5,
      verified: true,
      quote:
        "가족용으로 만족. 2열 공간과 시트 착좌감이 좋아요. 소프트웨어 업데이트 이후 커넥티드가 안정화된 편.",
    },
    {
      id: "gk-r3",
      source: "media",
      author: "모터그래프",
      rating: 4,
      date: "2026-03",
      channel: "미디어 리뷰",
      url: "https://example.com/koleos-review",
      quote:
        "동급 최상위권 실연비. 다만 UX 완성도는 국산 경쟁 모델 대비 반 박자 느리다.",
    },
    {
      id: "gk-r4",
      source: "video",
      author: "모카",
      rating: 4,
      date: "2026-02",
      channel: "YouTube",
      url: "https://example.com/koleos-video",
      quote:
        "이 가격에 이 정도 마감이면 진지하게 후보에 넣어야 한다. 다만 딜러망은 미리 확인 필요.",
    },
  ],
};

const SANTAFE_REVIEWS: ReviewBundle = {
  aiSummary: {
    overall: 4.4,
    sampleSize: 1128,
    tldr:
      "패밀리 SUV 완성도 자체는 최상위권 평가. 다만 가격·프로모션·인기 옵션 대기로 인한 불만이 함께 언급돼요.",
    pros: ["넓은 실내와 트렁크", "안정적 하이브리드 파워트레인", "잔존가치·중고 수요"],
    cons: ["가격 인상 체감", "인기 옵션 출고 대기", "공식 프로모션 부족"],
  },
  aspects: [
    { label: "승차감", score: 4.4 },
    { label: "연비", score: 4.3 },
    { label: "인테리어", score: 4.5 },
    { label: "정숙성", score: 4.2 },
    { label: "인포테인먼트", score: 4.3 },
    { label: "서비스망", score: 4.6 },
  ],
  items: [
    {
      id: "sf-r1",
      source: "owner",
      author: "부산 · 30대 오너",
      rating: 5,
      date: "2026-06",
      ownershipMonths: 2,
      verified: true,
      quote:
        "가족 3명이 완전 만족. 하이브리드 실연비도 예상보다 좋고, 캘리그래피 마감이 확실히 다르네요.",
    },
    {
      id: "sf-r2",
      source: "owner",
      author: "인천 · 40대 오너",
      rating: 4,
      date: "2026-05",
      ownershipMonths: 8,
      verified: true,
      quote: "차 자체는 만점. 다만 실구매가가 너무 올라서 다음 부분변경까지 기다렸어야 했나 싶기도.",
    },
    {
      id: "sf-r3",
      source: "video",
      author: "오토포스트",
      rating: 4,
      date: "2026-03",
      channel: "YouTube",
      url: "https://example.com/santafe-video",
      quote: "패밀리 SUV로서는 여전히 상위권. 다만 다음 부분변경 루머를 감안하면 시점 판단이 관건.",
    },
  ],
};

const SORENTO_REVIEWS: ReviewBundle = {
  aiSummary: {
    overall: 4.3,
    sampleSize: 894,
    tldr:
      "7인승 수요에는 여전히 강력한 카드. 3열 공간과 승차감 만족도가 높고, 프로모션은 평범해 협상 여지에 달렸다는 평.",
    pros: ["7인승 실용성", "3열 공간과 승차감", "장거리 정숙성"],
    cons: ["프로모션 폭 평범", "옵션 패키지 강매 체감", "인기 색상 대기"],
  },
  aspects: [
    { label: "승차감", score: 4.5 },
    { label: "연비", score: 4.2 },
    { label: "인테리어", score: 4.3 },
    { label: "정숙성", score: 4.4 },
    { label: "인포테인먼트", score: 4.1 },
    { label: "서비스망", score: 4.5 },
  ],
  items: [
    {
      id: "sr-r1",
      source: "owner",
      author: "대전 · 40대 오너",
      rating: 5,
      date: "2026-06",
      ownershipMonths: 4,
      verified: true,
      quote: "아이 둘 + 부모님까지 태우기 정말 편해요. 3열도 어른이 30분 정도는 무리 없이 갑니다.",
    },
    {
      id: "sr-r2",
      source: "owner",
      author: "서울 · 30대 오너",
      rating: 4,
      date: "2026-04",
      ownershipMonths: 10,
      verified: true,
      quote: "장거리 정숙성 훌륭. 다만 옵션 패키지 묶음이 아쉬워 원하는 조합 뽑기가 힘들었어요.",
    },
    {
      id: "sr-r3",
      source: "media",
      author: "카가이",
      rating: 4,
      date: "2026-01",
      channel: "미디어 리뷰",
      url: "https://example.com/sorento-review",
      quote: "여전히 국내 7인승 대표주자. 프로모션 시점만 잘 잡으면 만족도 매우 높음.",
    },
  ],
};

export const REVIEWS_BY_CAR: Record<string, ReviewBundle> = {
  "grand-koleos-inspire": KOLEOS_REVIEWS,
  "santafe-calligraphy": SANTAFE_REVIEWS,
  "sorento-noblesse": SORENTO_REVIEWS,
};

export const MOCK_CARS: MockCar[] = [
  {
    id: "grand-koleos-inspire",
    brand: "르노코리아",
    model: "그랑콜레오스",
    trim: "하이브리드 인스파이어",
    bodyType: "중형 SUV",
    listPrice: 39900000,
    medianContract: 36800000,
    minContract: 35400000,
    maxContract: 38200000,
    reports: 47,
    signal: "buy",
    headline: "지금 사도 좋아요",
    coach:
      "이번 달 프로모션이 최근 6개월 중 2번째로 좋아요. 밀어내기 시즌이라 추가 협상 여지도 충분.",
    promoPercentile: 88,
    facelift: { month: "2026-02", note: "연식변경 예상" },
    history: [3720, 3705, 3690, 3695, 3710, 3680],
    promoThisMonth: {
      label: "현금할인 + 저리 할부",
      amount: 2200000,
      note: "220만원 현금할인 또는 3.9% 저리",
    },
    imageColor: "from-emerald-400 to-teal-500",
    image: carGrandKoleos,
    fuelType: "hybrid",
    fuelEfficiency: 15.6,
    insuranceAnnual: 950000,
    benefits: [
      { id: "gk-cash", category: "cash", title: "런칭 프로모션 현금 할인", amount: 2200000, note: "7월 계약분 · 재고 한정", stackable: false, source: "official" },
      { id: "gk-fin", category: "finance", title: "3.9% 저리 할부 (36개월)", amount: 0, note: "현금 할인과 택1", stackable: false, source: "official" },
      { id: "gk-card", category: "card", title: "삼성카드 제휴 할인", amount: 700000, note: "삼성카드 60개월 할부 · 신차 신청 시", stackable: true, source: "external" },
      { id: "gk-trade", category: "tradein", title: "타사 SUV 보상", amount: 500000, note: "동급 SUV 폐차/이전 시", stackable: true, source: "official" },
      { id: "gk-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "개소세·취득세 감면 (하이브리드)", stackable: true, source: "external" },
      { id: "gk-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 800000, note: "지점별 편차 큼 · 협상 필요", stackable: true, source: "dealer" },
      { id: "gk-gift", category: "gift", title: "블랙박스 + 매트 패키지", amount: 350000, note: "출고 시 장착 지원", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "santafe-calligraphy",
    brand: "현대",
    model: "싼타페",
    trim: "캘리그래피 하이브리드 4WD",
    bodyType: "중형 SUV",
    listPrice: 49800000,
    medianContract: 48200000,
    minContract: 47100000,
    maxContract: 49500000,
    reports: 128,
    signal: "wait",
    headline: "조금만 기다려봐요",
    coach:
      "이번 달 공식 프로모션이 없어요. 다음 달 부분변경 발표 루머가 있어 재고 할인이 커질 가능성.",
    promoPercentile: 22,
    facelift: { month: "2026-01", note: "부분변경 루머" },
    history: [4870, 4855, 4840, 4835, 4820, 4820],
    promoThisMonth: {
      label: "프로모션 없음",
      amount: 0,
      note: "공식 할인 없음 · 딜러 재량 할인만 존재",
    },
    imageColor: "from-amber-400 to-orange-500",
    image: carSantafe,
    fuelType: "hybrid",
    fuelEfficiency: 14.2,
    insuranceAnnual: 1080000,
    benefits: [
      { id: "sf-card", category: "card", title: "현대카드 M 제휴 할인", amount: 600000, note: "M포인트 100만 사용 시 추가", stackable: true, source: "external" },
      { id: "sf-trade", category: "tradein", title: "패밀리 세이브 (재구매)", amount: 400000, note: "현대·기아 5년 이내 소유주", stackable: true, source: "official" },
      { id: "sf-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "개소세·취득세 감면 (하이브리드)", stackable: true, source: "external" },
      { id: "sf-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 500000, note: "인기 모델 · 폭 작음", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "sorento-noblesse",
    brand: "기아",
    model: "쏘렌토",
    trim: "노블레스 하이브리드 7인승",
    bodyType: "중형 SUV",
    listPrice: 47600000,
    medianContract: 45300000,
    minContract: 44100000,
    maxContract: 46800000,
    reports: 96,
    signal: "neutral",
    headline: "평범한 시기예요",
    coach:
      "실거래가·프로모션 모두 6개월 평균 수준. 급하지 않다면 12월 연말 재고 정리를 노려볼만해요.",
    promoPercentile: 55,
    facelift: null,
    history: [4560, 4550, 4540, 4535, 4540, 4530],
    promoThisMonth: {
      label: "저리 할부",
      amount: 800000,
      note: "3년 4.5% · 현금할인 없음",
    },
    imageColor: "from-sky-400 to-indigo-500",
    image: carSorento,
    fuelType: "hybrid",
    fuelEfficiency: 13.8,
    insuranceAnnual: 1120000,
    benefits: [
      { id: "sr-fin", category: "finance", title: "저리 할부 4.5% (36개월)", amount: 800000, note: "동급 대비 -1.5%p 절감 효과", stackable: false, source: "official" },
      { id: "sr-card", category: "card", title: "KB국민카드 제휴", amount: 500000, note: "60개월 할부 · 신차 계약 시", stackable: true, source: "external" },
      { id: "sr-loyalty", category: "loyalty", title: "기아 패밀리 재구매", amount: 300000, note: "기아 차량 소유주", stackable: true, source: "official" },
      { id: "sr-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "개소세·취득세 감면 (하이브리드)", stackable: true, source: "external" },
      { id: "sr-group", category: "group", title: "법인·개인사업자 추가", amount: 500000, note: "사업자등록증 확인 시", stackable: true, source: "official" },
      { id: "sr-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 700000, note: "연말 재고 정리 시 확대 가능", stackable: true, source: "dealer" },
      { id: "sr-gift", category: "gift", title: "썬팅 + 매트 지원", amount: 400000, note: "출고 시 장착", stackable: true, source: "dealer" },
    ],
  },
  // Gate 0 확장 — 시그널·가격 풀스펙 (이미지 없는 차종은 gradient placeholder)
  {
    id: "hyundai-sonata",
    brand: "현대",
    model: "쏘나타",
    trim: "인스퍼레이션 하이브리드",
    bodyType: "중형 세단",
    listPrice: 38900000,
    medianContract: 36100000,
    minContract: 34800000,
    maxContract: 37500000,
    reports: 64,
    signal: "buy",
    headline: "할인 폭이 괜찮은 달이에요",
    coach: "중형 세단 수요가 한산한 시기라 딜러 재량·카드 조합으로 중앙값 이하도 가능해요.",
    promoPercentile: 72,
    facelift: null,
    history: [3680, 3660, 3640, 3630, 3620, 3610],
    promoThisMonth: { label: "현금할인", amount: 1500000, note: "150만원 또는 저리 택1" },
    imageColor: "from-slate-400 to-slate-600",
    fuelType: "hybrid",
    fuelEfficiency: 18.1,
    insuranceAnnual: 820000,
    benefits: [
      { id: "sn-cash", category: "cash", title: "공식 현금 할인", amount: 1500000, note: "7월 계약분", stackable: false, source: "official" },
      { id: "sn-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "하이브리드", stackable: true, source: "external" },
      { id: "sn-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 600000, note: "지점 편차", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "kia-k5",
    brand: "기아",
    model: "K5",
    trim: "시그니처 하이브리드",
    bodyType: "중형 세단",
    listPrice: 37600000,
    medianContract: 34900000,
    minContract: 33800000,
    maxContract: 36200000,
    reports: 52,
    signal: "buy",
    headline: "프로모션이 강한 편이에요",
    coach: "쏘나타와 비슷한 타이밍. 재고 많은 색상부터 물어보면 추가 할인이 나와요.",
    promoPercentile: 78,
    facelift: null,
    history: [3550, 3530, 3520, 3510, 3500, 3490],
    promoThisMonth: { label: "현금할인 + 카드", amount: 1800000, note: "공식 180만 + 제휴 가능" },
    imageColor: "from-red-400 to-rose-600",
    fuelType: "hybrid",
    fuelEfficiency: 17.8,
    insuranceAnnual: 800000,
    benefits: [
      { id: "k5-cash", category: "cash", title: "공식 현금 할인", amount: 1800000, note: "7월", stackable: false, source: "official" },
      { id: "k5-card", category: "card", title: "KB국민카드 제휴", amount: 400000, note: "신차 할부", stackable: true, source: "external" },
      { id: "k5-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 500000, note: "재고 색상 우선", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "kia-carnival",
    brand: "기아",
    model: "카니발",
    trim: "시그니처 하이브리드 9인승",
    bodyType: "미니밴",
    listPrice: 49800000,
    medianContract: 47900000,
    minContract: 46800000,
    maxContract: 49200000,
    reports: 88,
    signal: "neutral",
    headline: "수요가 꾸준한 차예요",
    coach: "인기 트림은 할인 폭이 얇아요. 급하지 않으면 월말·분기말 재고를 노려보세요.",
    promoPercentile: 48,
    facelift: null,
    history: [4840, 4820, 4810, 4800, 4795, 4790],
    promoThisMonth: { label: "저리 할부", amount: 600000, note: "현금할인 약함" },
    imageColor: "from-violet-400 to-indigo-600",
    fuelType: "hybrid",
    fuelEfficiency: 12.4,
    insuranceAnnual: 1150000,
    benefits: [
      { id: "cv-fin", category: "finance", title: "저리 할부", amount: 600000, note: "36개월", stackable: false, source: "official" },
      { id: "cv-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "하이브리드", stackable: true, source: "external" },
      { id: "cv-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 400000, note: "인기 모델 · 폭 작음", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "hyundai-palisade",
    brand: "현대",
    model: "팰리세이드",
    trim: "캘리그래피 하이브리드",
    bodyType: "대형 SUV",
    listPrice: 62800000,
    medianContract: 60100000,
    minContract: 58800000,
    maxContract: 61800000,
    reports: 41,
    signal: "wait",
    headline: "부분변경 전후를 보세요",
    coach: "페이스리프트 루머가 있어 지금 풀옵션 계약은 감가 리스크가 있어요.",
    promoPercentile: 28,
    facelift: { month: "2026-09", note: "부분변경 예상" },
    history: [6120, 6100, 6080, 6050, 6030, 6010],
    promoThisMonth: { label: "프로모션 약함", amount: 300000, note: "공식 할인 미미" },
    imageColor: "from-stone-400 to-stone-700",
    fuelType: "hybrid",
    fuelEfficiency: 12.1,
    insuranceAnnual: 1280000,
    benefits: [
      { id: "pl-trade", category: "tradein", title: "패밀리 세이브", amount: 500000, note: "현대·기아 재구매", stackable: true, source: "official" },
      { id: "pl-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "하이브리드", stackable: true, source: "external" },
      { id: "pl-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 700000, note: "연식변경 전 재고", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "kia-ev3",
    brand: "기아",
    model: "EV3",
    trim: "GT라인",
    bodyType: "소형 전기 SUV",
    listPrice: 49950000,
    medianContract: 45200000,
    minContract: 43800000,
    maxContract: 46800000,
    reports: 37,
    signal: "buy",
    headline: "보조금·할인이 겹치는 구간",
    coach: "국비·지자체 보조금 잔여와 공식 할인을 같이 확인하세요. 잔여 소진 전에 계약하는 편이 유리해요.",
    promoPercentile: 81,
    facelift: null,
    history: [4620, 4580, 4560, 4540, 4530, 4520],
    promoThisMonth: { label: "전기차 프로모션", amount: 2000000, note: "보조금 별도" },
    imageColor: "from-cyan-400 to-blue-600",
    fuelType: "ev",
    fuelEfficiency: 5.4,
    insuranceAnnual: 980000,
    benefits: [
      { id: "ev3-cash", category: "cash", title: "공식 할인", amount: 2000000, note: "7월", stackable: false, source: "official" },
      { id: "ev3-eco", category: "eco", title: "전기차 보조금·세제", amount: 0, note: "지자체별 상이", stackable: true, source: "external" },
      { id: "ev3-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 500000, note: "재고 한정", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "hyundai-avante",
    brand: "현대",
    model: "아반떼",
    trim: "인스퍼레이션 하이브리드",
    bodyType: "준중형 세단",
    listPrice: 28900000,
    medianContract: 26800000,
    minContract: 25900000,
    maxContract: 27800000,
    reports: 112,
    signal: "neutral",
    headline: "표본이 많아 시세가 안정적이에요",
    coach: "할인 폭은 평이합니다. 급하면 지금, 여유면 월말 재고를 한 번 더 물어보세요.",
    promoPercentile: 55,
    facelift: null,
    history: [2720, 2710, 2700, 2695, 2690, 2680],
    promoThisMonth: { label: "기본 프로모션", amount: 800000, note: "평년 수준" },
    imageColor: "from-sky-300 to-sky-600",
    fuelType: "hybrid",
    fuelEfficiency: 19.8,
    insuranceAnnual: 720000,
    benefits: [
      { id: "av-cash", category: "cash", title: "공식 현금 할인", amount: 800000, note: "7월", stackable: false, source: "official" },
      { id: "av-eco", category: "eco", title: "친환경차 세제혜택", amount: 1430000, note: "하이브리드", stackable: true, source: "external" },
      { id: "av-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 400000, note: "지점 편차", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "genesis-gv70",
    brand: "제네시스",
    model: "GV70",
    trim: "2.5T AWD",
    bodyType: "프리미엄 SUV",
    listPrice: 61200000,
    medianContract: 56800000,
    minContract: 55200000,
    maxContract: 58500000,
    reports: 29,
    signal: "wait",
    headline: "프리미엄은 타이밍이 더 중요해요",
    coach: "재고 모델·전시차는 할인 폭이 커요. 신차 주문이라면 분기 말까지 기다려볼 만합니다.",
    promoPercentile: 35,
    facelift: null,
    history: [5780, 5750, 5720, 5700, 5690, 5680],
    promoThisMonth: { label: "재고 한정 할인", amount: 1200000, note: "전시·재고 우선" },
    imageColor: "from-zinc-500 to-zinc-800",
    fuelType: "gasoline",
    fuelEfficiency: 9.8,
    insuranceAnnual: 1450000,
    benefits: [
      { id: "gv-cash", category: "cash", title: "재고 할인", amount: 1200000, note: "한정", stackable: false, source: "official" },
      { id: "gv-loyalty", category: "loyalty", title: "제네시스 재구매", amount: 500000, note: "기존 오너", stackable: true, source: "official" },
      { id: "gv-dealer", category: "cash", title: "딜러 재량 할인 (예상)", amount: 900000, note: "재고·전시차", stackable: true, source: "dealer" },
    ],
  },
  {
    id: "hyundai-grandeur",
    brand: "현대",
    model: "그랜저",
    trim: "더 뉴 그랜저 캘리그래피",
    bodyType: "준대형 세단",
    listPrice: 50890000,
    medianContract: 48900000,
    minContract: 47200000,
    maxContract: 50200000,
    reports: 64,
    signal: "neutral",
    headline: "할부·트레이드인이 핵심이에요",
    coach:
      "공식 현금 할인보다 모빌리티 할부·트레이드인 조건이 눈에 띕니다. 기변 계획이 있으면 현대/제네시스 매각 시 트레이드인 50만을 먼저 챙기세요.",
    promoPercentile: 58,
    facelift: null,
    history: [4980, 4950, 4930, 4910, 4900, 4890],
    promoThisMonth: {
      label: "모빌리티 할부 4.9%",
      amount: 0,
      note: "36개월 표준형 · 트레이드인 별도",
    },
    imageColor: "from-slate-400 to-slate-700",
    fuelType: "hybrid",
    fuelEfficiency: 16.2,
    insuranceAnnual: 980000,
    benefitsPeriod: danawaGrandeurBenefits.period,
    benefits: [
      ...(danawaGrandeurBenefits.benefits as Benefit[]),
      {
        id: "gr-eco",
        category: "eco",
        title: "친환경차 세제혜택",
        amount: 1430000,
        note: "개소세·취득세 감면 (하이브리드) · 공식 판매조건 외",
        stackable: true,
        source: "external",
      },
    ],
  },
];

export function findCar(id: string) {
  return MOCK_CARS.find((c) => c.id === id);
}

export function formatKRW(v: number) {
  if (v >= 10000000) return `₩${(v / 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}만`;
  return `₩${v.toLocaleString()}`;
}

export function signalColor(s: Signal) {
  return s === "buy"
    ? { bg: "bg-[color:var(--color-signal-buy-soft)]", text: "text-[color:var(--color-signal-buy)]", dot: "bg-[color:var(--color-signal-buy)]" }
    : s === "wait"
      ? { bg: "bg-[color:var(--color-signal-wait-soft)]", text: "text-[color:var(--color-signal-wait)]", dot: "bg-[color:var(--color-signal-wait)]" }
      : { bg: "bg-[color:var(--color-signal-neutral-soft)]", text: "text-[color:var(--color-signal-neutral)]", dot: "bg-[color:var(--color-signal-neutral)]" };
}

export function signalLabel(s: Signal) {
  return s === "buy" ? "지금 살 때" : s === "wait" ? "기다려" : "중립";
}

export function signalEmoji(s: Signal) {
  return s === "buy" ? "🟢" : s === "wait" ? "🟡" : "⚪";
}

/* ============ Supabase 시드 트림 ID 매핑 ============ */
// 앱은 MOCK_CARS의 id로 라우팅하지만, DB에 insert할 때는 실제 trims.id가 필요하다.
export const TRIM_ID_MAP: Record<string, string> = {
  "grand-koleos-inspire": "22222222-2222-2222-2222-222222220001",
  "santafe-calligraphy": "22222222-2222-2222-2222-222222220002",
  "sorento-noblesse": "22222222-2222-2222-2222-222222220003",
  "hyundai-sonata": "22222222-2222-2222-2222-222222220004",
  "kia-k5": "22222222-2222-2222-2222-222222220005",
  "kia-carnival": "22222222-2222-2222-2222-222222220006",
  "hyundai-palisade": "22222222-2222-2222-2222-222222220007",
  "kia-ev3": "22222222-2222-2222-2222-222222220008",
  "hyundai-avante": "22222222-2222-2222-2222-222222220009",
  "genesis-gv70": "22222222-2222-2222-2222-222222220010",
  "hyundai-grandeur": "22222222-2222-2222-2222-222222220011",
};

/* ============ 유지비 추정 ============ */

// 2026년 7월 기준 (mock)
const FUEL_PRICE: Record<MockCar["fuelType"], { price: number; unit: string; label: string }> = {
  gasoline: { price: 1720, unit: "L", label: "휘발유" },
  diesel: { price: 1580, unit: "L", label: "경유" },
  hybrid: { price: 1720, unit: "L", label: "휘발유 (하이브리드)" },
  ev: { price: 340, unit: "kWh", label: "전기" },
};

export const MILEAGE_MAP: Record<string, { km: number; label: string }> = {
  low: { km: 8000, label: "1만km 이하" },
  mid: { km: 15000, label: "1~2만km" },
  high: { km: 25000, label: "2만km 이상" },
};

export function estimateOwnership(car: MockCar, annualKm: number) {
  const fuel = FUEL_PRICE[car.fuelType];
  const annualFuelCost = Math.round((annualKm / car.fuelEfficiency) * fuel.price);
  const monthlyFuel = Math.round(annualFuelCost / 12);
  const monthlyInsurance = Math.round(car.insuranceAnnual / 12);
  // 소모품·정비 (mock, 브랜드/차급 러프)
  const annualMaintenance = Math.round(car.listPrice * 0.008);
  const monthlyMaintenance = Math.round(annualMaintenance / 12);
  const monthlyTotal = monthlyFuel + monthlyInsurance + monthlyMaintenance;
  return {
    fuel,
    annualKm,
    annualFuelCost,
    monthlyFuel,
    monthlyInsurance,
    annualInsurance: car.insuranceAnnual,
    annualMaintenance,
    monthlyMaintenance,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
  };
}

/* ============ 주간 변화 요약 (홈 재방문 훅) ============ */

export type WeeklyChange = {
  priceDelta: number;         // 만원 단위, - 이면 하락
  priceDeltaPct: number;      // % (소수 1자리)
  direction: "down" | "up" | "flat";
  promoRefreshed: boolean;    // 이번 달 프로모션이 유의미하게 갱신됐는지
  headline: string;           // 카드 상단에 그대로 노출할 한 줄
};

export function weeklyChangeFor(car: MockCar): WeeklyChange {
  const h = car.history;
  const last = h[h.length - 1] ?? 0;
  const prev = h[h.length - 2] ?? last;
  const delta = last - prev; // 만원 단위 저장돼 있음
  const pct = prev === 0 ? 0 : Math.round((delta / prev) * 1000) / 10;
  const dir: WeeklyChange["direction"] = delta < 0 ? "down" : delta > 0 ? "up" : "flat";
  const promoRefreshed = car.promoThisMonth.amount >= 1500000 || car.promoPercentile >= 80;
  let headline: string;
  if (dir === "down") {
    headline = `이번주 -${Math.abs(delta)}만 · 실거래 ${Math.abs(pct)}% ↓`;
  } else if (dir === "up") {
    headline = `이번주 +${delta}만 · 실거래 ${pct}% ↑`;
  } else if (promoRefreshed) {
    headline = `이번달 프로모션 갱신 · ${car.promoThisMonth.label}`;
  } else {
    headline = "이번주 변동 없음 · 지켜보는 중";
  }
  return { priceDelta: delta, priceDeltaPct: pct, direction: dir, promoRefreshed, headline };
}

/* ============ 전체 차량 카탈로그 (탐색 · 관심 담기 소스) ============
 * MOCK_CARS는 시그널 상세가 있는 차 (Gate 0 seed 10대 + 그랜저 혜택 프리뷰).
 * CATALOG는 앱이 인지하는 전 차종. catalogHasDetail이면 상세 링크.
 */
export type Fuel = MockCar["fuelType"];
export type CatalogTag = "hot" | "new" | "facelift" | "discount";

export type CatalogEntry = {
  id: string;
  brand: string;
  model: string;
  bodyType: string;
  priceFrom: number; // 만원
  priceTo: number;   // 만원
  fuels: Fuel[];
  tag?: CatalogTag;
};

export const CATALOG: CatalogEntry[] = [
  // 시그널 오픈 (MOCK_CARS)
  { id: "grand-koleos-inspire", brand: "르노코리아", model: "그랑콜레오스", bodyType: "중형 SUV", priceFrom: 3540, priceTo: 3990, fuels: ["hybrid"], tag: "discount" },
  { id: "santafe-calligraphy",  brand: "현대",       model: "싼타페",      bodyType: "중형 SUV", priceFrom: 3540, priceTo: 4980, fuels: ["gasoline","hybrid"], tag: "hot" },
  { id: "sorento-noblesse",     brand: "기아",       model: "쏘렌토",      bodyType: "중형 SUV", priceFrom: 3320, priceTo: 4760, fuels: ["gasoline","hybrid","diesel"], tag: "hot" },
  { id: "hyundai-sonata",   brand: "현대", model: "쏘나타",   bodyType: "중형 세단",   priceFrom: 2830, priceTo: 3990, fuels: ["gasoline","hybrid"] },
  { id: "kia-k5",           brand: "기아", model: "K5",       bodyType: "중형 세단",   priceFrom: 2790, priceTo: 3910, fuels: ["gasoline","hybrid"], tag: "discount" },
  { id: "kia-carnival",     brand: "기아", model: "카니발",   bodyType: "미니밴", priceFrom: 3600, priceTo: 5400, fuels: ["gasoline","diesel","hybrid"], tag: "hot" },
  { id: "hyundai-palisade", brand: "현대", model: "팰리세이드", bodyType: "대형 SUV", priceFrom: 4500, priceTo: 7200, fuels: ["gasoline","hybrid","diesel"], tag: "facelift" },
  { id: "kia-ev3",          brand: "기아", model: "EV3",      bodyType: "소형 전기 SUV", priceFrom: 3550, priceTo: 4400, fuels: ["ev"], tag: "new" },
  { id: "hyundai-avante",   brand: "현대", model: "아반떼",   bodyType: "준중형 세단", priceFrom: 1990, priceTo: 3050, fuels: ["gasoline","hybrid"] },
  { id: "genesis-gv70",     brand: "제네시스", model: "GV70", bodyType: "프리미엄 SUV", priceFrom: 5600, priceTo: 8100, fuels: ["gasoline","diesel"] },

  // 곧 오픈
  { id: "hyundai-grandeur", brand: "현대", model: "그랜저",   bodyType: "준대형 세단", priceFrom: 4185, priceTo: 6089, fuels: ["gasoline","hybrid"] },
  { id: "kia-k8",           brand: "기아", model: "K8",       bodyType: "준대형 세단", priceFrom: 3720, priceTo: 5480, fuels: ["gasoline","hybrid"] },
  { id: "genesis-g80",      brand: "제네시스", model: "G80",  bodyType: "프리미엄 세단", priceFrom: 6300, priceTo: 8600, fuels: ["gasoline","diesel"] },

  // SUV
  { id: "hyundai-kona",     brand: "현대", model: "코나",     bodyType: "소형 SUV", priceFrom: 2400, priceTo: 3400, fuels: ["gasoline","hybrid"] },
  { id: "kia-seltos",       brand: "기아", model: "셀토스",   bodyType: "소형 SUV", priceFrom: 2200, priceTo: 3100, fuels: ["gasoline"] },
  { id: "genesis-gv80",     brand: "제네시스", model: "GV80", bodyType: "프리미엄 SUV", priceFrom: 7100, priceTo: 10500, fuels: ["gasoline","diesel"] },
  { id: "kgm-torres",       brand: "KG모빌리티", model: "토레스", bodyType: "중형 SUV", priceFrom: 2900, priceTo: 3700, fuels: ["gasoline"] },

  // 미니밴
  { id: "hyundai-staria",   brand: "현대", model: "스타리아", bodyType: "미니밴", priceFrom: 2900, priceTo: 4600, fuels: ["gasoline","diesel"] },

  // 전기
  { id: "hyundai-ioniq5",   brand: "현대", model: "아이오닉5", bodyType: "전기 SUV",     priceFrom: 4695, priceTo: 5700, fuels: ["ev"] },
  { id: "kia-ev6",          brand: "기아", model: "EV6",      bodyType: "전기 SUV",     priceFrom: 4870, priceTo: 5900, fuels: ["ev"] },
  { id: "kia-ev9",          brand: "기아", model: "EV9",      bodyType: "대형 전기 SUV", priceFrom: 7500, priceTo: 8900, fuels: ["ev"] },
  { id: "hyundai-casper-ev", brand: "현대", model: "캐스퍼 EV", bodyType: "경형 전기", priceFrom: 2740, priceTo: 3300, fuels: ["ev"], tag: "new" },
];

export function catalogHasDetail(id: string): boolean {
  return MOCK_CARS.some((c) => c.id === id);
}

export const FUEL_LABEL: Record<Fuel, string> = {
  gasoline: "가솔린",
  diesel: "디젤",
  hybrid: "하이브리드",
  ev: "전기",
};

export const BODY_GROUPS: { id: string; label: string; match: (b: string) => boolean }[] = [
  { id: "all",   label: "전체",   match: () => true },
  { id: "sedan", label: "세단",   match: (b) => b.includes("세단") },
  { id: "suv",   label: "SUV",    match: (b) => b.includes("SUV") },
  { id: "van",   label: "미니밴", match: (b) => b.includes("미니밴") },
  { id: "ev",    label: "전기",   match: (b) => b.includes("전기") },
];