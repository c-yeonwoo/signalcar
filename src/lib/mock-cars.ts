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

export const BENEFIT_META: Record<BenefitCategory, { label: string; emoji: string }> = {
  cash: { label: "현금 할인", emoji: "💵" },
  finance: { label: "저리 할부/리스", emoji: "🏦" },
  card: { label: "제휴 카드", emoji: "💳" },
  tradein: { label: "기변·보상", emoji: "🔁" },
  loyalty: { label: "재구매·패밀리", emoji: "👨‍👩‍👧" },
  group: { label: "법인·단체", emoji: "🏢" },
  eco: { label: "친환경 세제혜택", emoji: "🌱" },
  gift: { label: "사은품", emoji: "🎁" },
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