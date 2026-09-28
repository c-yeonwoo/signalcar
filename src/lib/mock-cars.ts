
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
  priceEvidence?: "verified_contract" | "unverified";
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

/** 실데이터 주입 대상 — hydrate 전엔 빈 배열 */
export let MOCK_CARS: MockCar[] = [];

export function bindLiveCars(cars: MockCar[]) {
  MOCK_CARS = cars;
  CATALOG = buildCatalogFromCars(cars);
}

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

/* ============ 확인된 계약 가격 기록 간 변화 ============ */

export type RecordedPriceChange = {
  priceDelta: number;         // 만원 단위, - 이면 하락
  priceDeltaPct: number;      // % (소수 1자리)
  direction: "down" | "up" | "flat";
  comparable: boolean;
  headline: string;           // 카드 상단에 그대로 노출할 한 줄
};

export function recordedPriceChangeFor(car: MockCar): RecordedPriceChange {
  const h = car.history;
  if (car.priceEvidence !== "verified_contract" || h.length < 2 || h[h.length - 1] <= 0 || h[h.length - 2] <= 0) {
    return { priceDelta: 0, priceDeltaPct: 0, direction: "flat", comparable: false, headline: "비교할 계약 가격 기록이 부족해요" };
  }
  const last = h[h.length - 1] ?? 0;
  const prev = h[h.length - 2] ?? last;
  const delta = last - prev; // 만원 단위 저장돼 있음
  const pct = Math.round((delta / prev) * 1000) / 10;
  const dir: RecordedPriceChange["direction"] = delta < 0 ? "down" : delta > 0 ? "up" : "flat";
  let headline: string;
  if (dir === "down") {
    headline = `이전 기록 대비 -${Math.abs(delta)}만 · ${Math.abs(pct)}% ↓`;
  } else if (dir === "up") {
    headline = `이전 기록 대비 +${delta}만 · ${pct}% ↑`;
  } else {
    headline = "이전 기록과 계약 가격 같음";
  }
  return { priceDelta: delta, priceDeltaPct: pct, direction: dir, comparable: true, headline };
}

/* ============ 전체 차량 카탈로그 (탐색 · 관심 담기 소스) ============
 * 실데이터는 car_profiles + price_signals. bindLiveCars()로 주입.
 * CATALOG는 현재 제공하는 차종. 항목마다 상세 링크가 있다.
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

export let CATALOG: CatalogEntry[] = [];

export function buildCatalogFromCars(cars: MockCar[]): CatalogEntry[] {
  const map = new Map<string, CatalogEntry>();
  for (const c of cars) {
    const key = `${c.brand}|${c.model}`;
    const man = Math.round(c.listPrice / 10_000);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        id: c.id,
        brand: c.brand,
        model: c.model,
        bodyType: c.bodyType,
        priceFrom: man,
        priceTo: man,
        fuels: [c.fuelType],
      });
    } else {
      prev.priceFrom = Math.min(prev.priceFrom, man);
      prev.priceTo = Math.max(prev.priceTo, man);
      if (!prev.fuels.includes(c.fuelType)) prev.fuels.push(c.fuelType);
    }
  }
  return [...map.values()];
}

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
