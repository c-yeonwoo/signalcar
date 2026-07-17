import type { MockCar } from "@/lib/mock-cars";
import { computeTiming, daysUntilFaceliftMonth } from "./timing";
import type { TimingResult } from "./types";
import { BRAIN_VERSION } from "./version";

/** 상세 페이지용 — MockCar 필드로 Timing 이유를 즉시 계산 */
export function explainCarTiming(car: MockCar): TimingResult & { brainVersion: string } {
  const discountRatio =
    car.listPrice > 0 ? (car.listPrice - car.medianContract) / car.listPrice : null;
  const promoAmountRatio =
    car.listPrice > 0 && car.promoThisMonth.amount > 0
      ? car.promoThisMonth.amount / car.listPrice
      : null;

  const result = computeTiming({
    sampleSize: car.reports,
    promoPercentile: car.promoPercentile > 0 ? car.promoPercentile : null,
    discountRatio,
    daysToFacelift: daysUntilFaceliftMonth(car.facelift),
    salesMomentum: null,
    promoAmountRatio,
  });

  // DB 시그널과 UI 라벨이 어긋날 때 이유를 보강
  if (car.signal === "buy" && result.verdict !== "buy" && !result.reasons.includes("지금 시그널은 BUY")) {
    result.reasons = [`집계 시그널은 ${car.signal.toUpperCase()}`, ...result.reasons].slice(0, 4);
  }

  return { ...result, brainVersion: BRAIN_VERSION };
}
