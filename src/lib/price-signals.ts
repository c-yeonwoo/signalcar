/**
 * DB price_signals ↔ 앱 carId 브릿지.
 * 시드/실데이터가 있으면 MockCar의 시그널·가격·표본을 덮어쓴다.
 * DB miss / 네트워크 실패 시 mock 그대로 (하위 호환).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_CARS,
  TRIM_ID_MAP,
  type MockCar,
  type Signal,
} from "@/lib/mock-cars";

export const GATE0_MIN_SAMPLE = 15;

export type PriceSignalRow = {
  trim_id: string;
  month: string;
  median_deal_price: number | null;
  sample_size: number;
  promo_percentile: number | null;
  timing_verdict: "buy" | "wait" | "neutral" | null;
};

const CAR_ID_BY_TRIM: Record<string, string> = Object.fromEntries(
  Object.entries(TRIM_ID_MAP).map(([carId, uuid]) => [uuid, carId]),
);

let cache: Map<string, PriceSignalRow> | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

export function isGate0Verified(sampleSize: number) {
  return sampleSize >= GATE0_MIN_SAMPLE;
}

export async function fetchLatestSignalsByTrim(
  trimIds: string[] = Object.values(TRIM_ID_MAP),
): Promise<Map<string, PriceSignalRow>> {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_MS) return cache;

  const map = new Map<string, PriceSignalRow>();
  if (trimIds.length === 0) {
    cache = map;
    cacheAt = now;
    return map;
  }

  const { data, error } = await supabase
    .from("price_signals")
    .select("trim_id, month, median_deal_price, sample_size, promo_percentile, timing_verdict")
    .in("trim_id", trimIds)
    .order("month", { ascending: false });

  if (error || !data) {
    cache = map;
    cacheAt = now;
    return map;
  }

  // trim당 최신 month 1건만
  for (const row of data as PriceSignalRow[]) {
    if (!map.has(row.trim_id)) map.set(row.trim_id, row);
  }
  cache = map;
  cacheAt = now;
  return map;
}

export function applySignalToCar(car: MockCar, row: PriceSignalRow | undefined): MockCar {
  if (!row || row.median_deal_price == null) return car;
  const signal = (row.timing_verdict ?? car.signal) as Signal;
  const median = row.median_deal_price;
  const spread = Math.max(car.maxContract - car.minContract, Math.round(median * 0.04));
  return {
    ...car,
    medianContract: median,
    minContract: Math.round(median - spread / 2),
    maxContract: Math.round(median + spread / 2),
    reports: row.sample_size > 0 ? row.sample_size : car.reports,
    signal,
    promoPercentile:
      row.promo_percentile != null ? Number(row.promo_percentile) : car.promoPercentile,
  };
}

/** carId → 최신 시그널이 반영된 MockCar (없으면 원본) */
export async function resolveCarWithSignal(carId: string): Promise<MockCar | undefined> {
  const base = MOCK_CARS.find((c) => c.id === carId);
  if (!base) return undefined;
  const trimId = TRIM_ID_MAP[carId];
  if (!trimId) return base;
  const signals = await fetchLatestSignalsByTrim([trimId]);
  return applySignalToCar(base, signals.get(trimId));
}

export async function resolveAllCarsWithSignals(): Promise<MockCar[]> {
  const signals = await fetchLatestSignalsByTrim();
  return MOCK_CARS.map((car) => {
    const trimId = TRIM_ID_MAP[car.id];
    return trimId ? applySignalToCar(car, signals.get(trimId)) : car;
  });
}

export function carIdFromTrimId(trimId: string): string | undefined {
  return CAR_ID_BY_TRIM[trimId];
}

export function invalidateSignalCache() {
  cache = null;
  cacheAt = 0;
}
