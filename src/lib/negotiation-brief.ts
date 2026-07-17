/**
 * 협상 리포트(브리핑) 콘텐츠 빌더.
 * Gate 0: MockCar 실거래·프로모션 필드로 결정적(deterministic) 리포트를 생성.
 * 이후 negotiation_briefs / deal_reports 집계로 교체 가능.
 */
import type { MockCar, Signal } from "@/lib/mock-cars";
import { formatKRW } from "@/lib/mock-cars";
import { computePriceBand } from "@/lib/brain";

export type NegotiationBrief = {
  carId: string;
  brand: string;
  model: string;
  trim: string;
  signal: Signal;
  sampleSize: number;
  median: number;
  min: number;
  max: number;
  listPrice: number;
  dealerDiscretionMin: number;
  dealerDiscretionMax: number;
  regionalSpread: { region: string; medianDelta: number; note: string }[];
  scripts: { channel: "phone" | "visit" | "text"; title: string; body: string }[];
  talkTracks: string[];
  traps: string[];
  generatedAt: string;
};

function dealerRange(car: MockCar) {
  const dealerBenefit = car.benefits.find((b) => b.source === "dealer" && b.amount > 0);
  const base = dealerBenefit?.amount ?? Math.round(car.listPrice * 0.015);
  return {
    min: Math.round(base * 0.5),
    max: Math.round(base * 1.4),
  };
}

function regional(car: MockCar) {
  const spread = Math.max(200000, Math.round((car.maxContract - car.minContract) * 0.35));
  return [
    { region: "수도권", medianDelta: 0, note: "표본 최다 · 기준 중앙값" },
    { region: "충청·강원", medianDelta: -Math.round(spread * 0.4), note: "재고 밀어내기 시 할인 확대" },
    { region: "영남", medianDelta: Math.round(spread * 0.25), note: "인기 트림은 할인 폭 축소" },
    { region: "호남·제주", medianDelta: -Math.round(spread * 0.2), note: "출고 대기로 협상 여지" },
  ];
}

function scriptsFor(car: MockCar, disc: { min: number; max: number }): NegotiationBrief["scripts"] {
  const band = computePriceBand({
    listPrice: car.listPrice,
    medianDealPrice: car.medianContract,
    p25DealPrice: car.minContract,
    p75DealPrice: car.maxContract,
    sampleSize: car.reports,
    promoAmount: car.promoThisMonth.amount,
  });
  const target =
    band.target != null
      ? band.target - Math.round(disc.min * 0.4)
      : car.medianContract - Math.round(disc.min * 0.6);
  const promo = car.promoThisMonth;
  return [
    {
      channel: "phone",
      title: "전화 · 첫 제시가 받기",
      body: `안녕하세요, ${car.brand} ${car.model} ${car.trim} 견적 문의드립니다. 최근 실거래 중앙값이 ${formatKRW(car.medianContract)} 근처로 알고 있어요. ${promo.amount > 0 ? `이번 달 ${promo.label} 기준으로` : "공식 프로모션이 약해서"} 총 ${formatKRW(target)} 전후로 맞춰주실 수 있을까요?`,
    },
    {
      channel: "visit",
      title: "현장 · 재량 할인 확인",
      body: `견적서에 딜러 재량(${formatKRW(disc.min)}~${formatKRW(disc.max)})이 별도 표기돼 있는지 확인부탁드려요. 타 지점 제시가와 비교 중이라, 재량 할인을 포함한 최종가를 숫자로 받고 싶습니다.`,
    },
    {
      channel: "text",
      title: "문자 · 조건 고정 요청",
      body: `${car.model} ${car.trim} / 목표 ${formatKRW(target)} (탁송·등록비 별도) / ${promo.label || "프로모션"} 적용 여부 회신 부탁드려요. 오늘 중 회신 주시면 계약 일정 잡겠습니다.`,
    },
  ];
}

export function buildNegotiationBrief(car: MockCar): NegotiationBrief {
  const disc = dealerRange(car);
  const gap = car.listPrice - car.medianContract;
  const talkTracks = [
    `정가 대비 실거래 중앙값 할인 폭은 약 ${formatKRW(gap)} (${Math.round((gap / car.listPrice) * 100)}%).`,
    car.promoPercentile >= 70
      ? `이번 달 프로모션 강도는 상위권(${car.promoPercentile}pt). 공식 혜택을 먼저 고정하세요.`
      : car.promoPercentile <= 30
        ? `공식 프로모션이 약한 달이에요. 딜러 재량·카드·기변을 조합해야 중앙값에 근접합니다.`
        : `프로모션은 평년 수준. 급하지 않다면 연말·월말 재고 타이밍을 같이 보세요.`,
    `표본 ${car.reports}건 기준 실거래 밴드는 ${formatKRW(car.minContract)} ~ ${formatKRW(car.maxContract)}.`,
  ];
  const traps = [
    "탁송비·등록대행비를 할인처럼 포장하는 견적",
    "저리 할부 선택 시 현금할인이 사라지는 택1 조건",
    "재고 차량 강요로 원치 않는 색상·옵션 유도",
    car.fuelType === "hybrid" || car.fuelType === "ev"
      ? "친환경 세제혜택을 딜러 할인처럼 중복 합산"
      : "카드 캐시백을 계약가 할인으로 오인하게 만드는 표현",
  ];

  return {
    carId: car.id,
    brand: car.brand,
    model: car.model,
    trim: car.trim,
    signal: car.signal,
    sampleSize: car.reports,
    median: car.medianContract,
    min: car.minContract,
    max: car.maxContract,
    listPrice: car.listPrice,
    dealerDiscretionMin: disc.min,
    dealerDiscretionMax: disc.max,
    regionalSpread: regional(car),
    scripts: scriptsFor(car, disc),
    talkTracks,
    traps,
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}
