/**
 * DB price_signals ↔ 앱 carId 브릿지.
 * 차량 메타·시그널은 `@/lib/cars` (car_profiles + price_signals)가 단일 소스.
 */
import { fetchCarsFromDb, resolveCar, type Car } from "@/lib/cars";
import { TRIM_ID_MAP, type MockCar } from "@/lib/mock-cars";

export const GATE0_MIN_SAMPLE = 15;

export type PriceSignalRow = {
  trim_id: string;
  month: string;
  median_deal_price: number | null;
  sample_size: number;
  promo_percentile: number | null;
  timing_verdict: "buy" | "wait" | "neutral" | null;
};

export function isGate0Verified(sampleSize: number) {
  return sampleSize >= GATE0_MIN_SAMPLE;
}

/** @deprecated 사용처는 resolveCar / fetchCarsFromDb로 이전 */
export async function resolveCarWithSignal(carId: string): Promise<MockCar | undefined> {
  return resolveCar(carId);
}

export async function resolveAllCarsWithSignals(): Promise<MockCar[]> {
  return fetchCarsFromDb();
}

export function carIdFromTrimId(trimId: string): string | undefined {
  const entry = Object.entries(TRIM_ID_MAP).find(([, uuid]) => uuid === trimId);
  return entry?.[0];
}

export function invalidateSignalCache() {
  // cars cache 무효화
  void import("@/lib/cars").then((m) => m.invalidateCarsCache());
}

export type { Car };
