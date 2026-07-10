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