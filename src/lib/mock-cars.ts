import carGrandKoleos from "@/assets/car-grand-koleos.png";
import carSantafe from "@/assets/car-santafe.png";
import carSorento from "@/assets/car-sorento.png";

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
  image: string;
  fuelType: "gasoline" | "diesel" | "hybrid" | "ev";
  fuelEfficiency: number; // km/L (or km/kWh for EV)
  insuranceAnnual: number; // 30대 남성 기준 예시 (원/년)
  benefits: Benefit[];
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
  verified?: boolean; // 시그널카 실계약 제보와 매칭됨
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