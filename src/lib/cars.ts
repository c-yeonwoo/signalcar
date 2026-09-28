/**
 * 실데이터 차량 카탈로그 (Supabase).
 * car_profiles + trims + vehicles + brands + price_signals
 */
import { supabase } from "@/integrations/supabase/client";
import type { Benefit, MockCar, Signal } from "@/lib/mock-cars";
import carGrandKoleos from "@/assets/car-grand-koleos.png";
import carSantafe from "@/assets/car-santafe.png";
import carSorento from "@/assets/car-sorento.png";

/** 로컬 에셋이 있는 차만 매핑 (나머지는 gradient) */
const IMAGE_BY_SLUG: Record<string, string> = {
  "grand-koleos-inspire": carGrandKoleos,
  "santafe-calligraphy": carSantafe,
  "sorento-noblesse": carSorento,
};

export type Car = MockCar & { trimId: string };

type DbRow = {
  trim_id: string;
  slug: string;
  body_type_label: string | null;
  headline: string | null;
  coach: string | null;
  image_color: string | null;
  fuel_efficiency: number | null;
  insurance_annual: number | null;
  benefits: Benefit[] | null;
  promo_label: string | null;
  promo_amount: number | null;
  promo_note: string | null;
  facelift: { month: string; note: string } | null;
  trim: {
    id: string;
    name: string;
    base_price: number | null;
    slug: string | null;
    vehicle: {
      id: string;
      model_name: string;
      fuel_type: string | null;
      brand: { name: string } | null;
    } | null;
  } | null;
};

type SignalRow = {
  trim_id: string;
  month: string;
  median_deal_price: number | null;
  sample_size: number;
  promo_percentile: number | null;
  timing_verdict: Signal | null;
  evidence_kind: "verified_contract" | "legacy_unverified";
};

let cache: Car[] = [];
let cacheAt = 0;
const CACHE_MS = 60_000;
let hydrating: Promise<Car[]> | null = null;

function mapFuel(f: string | null): MockCar["fuelType"] {
  if (f === "ev" || f === "electric") return "ev";
  if (f === "diesel") return "diesel";
  if (f === "gasoline" || f === "petrol") return "gasoline";
  return "hybrid";
}

function historyFromSignals(rows: SignalRow[], trimId: string): number[] {
  return rows
    .filter((r) => r.trim_id === trimId && r.median_deal_price != null)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((r) => Math.round((r.median_deal_price as number) / 10_000));
}

function toCar(profile: DbRow, latest: SignalRow | undefined, history: number[]): Car {
  const trim = profile.trim;
  const vehicle = trim?.vehicle;
  const brand = vehicle?.brand?.name ?? "";
  const listPrice = Number(trim?.base_price ?? 0);
  const verifiedSignal = latest?.evidence_kind === "verified_contract" &&
    latest.sample_size > 0 && Number(latest.median_deal_price) > 0 ? latest : undefined;
  const median = verifiedSignal ? Number(verifiedSignal.median_deal_price) : listPrice;
  const spread = Math.max(Math.round(median * 0.04), 400_000);
  const signal = verifiedSignal ? (verifiedSignal.timing_verdict ?? "neutral") as Signal : "neutral";
  const slug = profile.slug;

  return {
    id: slug,
    trimId: profile.trim_id,
    brand,
    model: vehicle?.model_name ?? "",
    trim: trim?.name ?? "",
    bodyType: profile.body_type_label ?? "",
    listPrice,
    medianContract: median,
    minContract: Math.round(median - spread / 2),
    maxContract: Math.round(median + spread / 2),
    reports: verifiedSignal?.sample_size ?? 0,
    priceEvidence: verifiedSignal ? "verified_contract" : "unverified",
    signal,
    headline: verifiedSignal ? (profile.headline ?? `${brand} ${vehicle?.model_name ?? ""}`) : "가격 근거를 확인하고 있어요",
    coach:
      verifiedSignal ? (profile.coach ?? "검증된 계약 정보가 있어요. 조건과 시점을 함께 확인하세요.") :
      "검증된 계약 표본과 가격 출처가 없어 구매 시점 판단을 제공하지 않아요.",
    promoPercentile: latest?.promo_percentile != null ? Number(latest.promo_percentile) : 50,
    facelift: profile.facelift ?? null,
    history: verifiedSignal ? history : [],
    promoThisMonth: {
      label: profile.promo_label ?? "프로모션",
      amount: Number(profile.promo_amount ?? 0),
      note: profile.promo_note ?? "",
    },
    imageColor: profile.image_color ?? "from-slate-400 to-slate-600",
    image: IMAGE_BY_SLUG[slug],
    fuelType: mapFuel(vehicle?.fuel_type ?? null),
    fuelEfficiency: Number(profile.fuel_efficiency ?? 12),
    insuranceAnnual: Number(profile.insurance_annual ?? 1_000_000),
    benefits: Array.isArray(profile.benefits) ? profile.benefits : [],
  };
}

export async function fetchCarsFromDb(force = false): Promise<Car[]> {
  const now = Date.now();
  if (!force && cache.length && now - cacheAt < CACHE_MS) return cache;
  if (hydrating) return hydrating;

  const load = (async () => {
    const { data: profiles, error } = await supabase
      .from("car_profiles")
      .select(
        `
        trim_id, slug, body_type_label, headline, coach, image_color,
        fuel_efficiency, insurance_annual, benefits,
        promo_label, promo_amount, promo_note, facelift,
        trim:trims (
          id, name, base_price, slug,
          vehicle:vehicles (
            id, model_name, fuel_type,
            brand:brands ( name )
          )
        )
      `,
      )
      .eq("published", true);

    if (error) throw new Error(`차량 정보를 불러오지 못했습니다: ${error.message}`);
    if (!profiles?.length) {
      cache = [];
      cacheAt = Date.now();
      const { bindLiveCars } = await import("@/lib/mock-cars");
      bindLiveCars(cache);
      return cache;
    }

    const trimIds = profiles.map((p) => p.trim_id);
    const { data: signals, error: signalError } = await supabase
      .from("price_signals")
      .select("trim_id, month, median_deal_price, sample_size, promo_percentile, timing_verdict, evidence_kind")
      .in("trim_id", trimIds)
      .eq("evidence_kind", "verified_contract")
      .order("month", { ascending: false });
    if (signalError) throw new Error(`가격 정보를 불러오지 못했습니다: ${signalError.message}`);

    const signalRows = (signals ?? []) as SignalRow[];
    const latestByTrim = new Map<string, SignalRow>();
    for (const row of signalRows) {
      if (!latestByTrim.has(row.trim_id)) latestByTrim.set(row.trim_id, row);
    }

    cache = (profiles as unknown as DbRow[]).map((p) =>
      toCar(p, latestByTrim.get(p.trim_id), historyFromSignals(signalRows, p.trim_id)),
    );
    const { bindLiveCars } = await import("@/lib/mock-cars");
    bindLiveCars(cache);
    cacheAt = Date.now();
    return cache;
  })();

  hydrating = load.finally(() => {
    hydrating = null;
  });

  return hydrating;
}

/** 동기 접근 — hydrateCars() 이후. 미하이드레이션 시 빈 배열 */
export function getCars(): Car[] {
  return cache;
}

export function findCar(id: string): Car | undefined {
  return cache.find((c) => c.id === id);
}

export async function resolveCar(id: string): Promise<Car | undefined> {
  const cars = await fetchCarsFromDb();
  return cars.find((c) => c.id === id);
}

export async function hydrateCars(): Promise<Car[]> {
  return fetchCarsFromDb(true);
}

export function invalidateCarsCache() {
  cache = [];
  cacheAt = 0;
}

export async function fetchCatalogEntries() {
  const cars = await fetchCarsFromDb();
  const byModel = new Map<
    string,
    { id: string; brand: string; model: string; bodyType: string; priceFrom: number; priceTo: number; fuels: string[] }
  >();
  for (const c of cars) {
    const key = `${c.brand}|${c.model}`;
    const existing = byModel.get(key);
    const man = Math.round(c.listPrice / 10_000);
    if (!existing) {
      byModel.set(key, {
        id: c.id,
        brand: c.brand,
        model: c.model,
        bodyType: c.bodyType,
        priceFrom: man,
        priceTo: man,
        fuels: [c.fuelType],
      });
    } else {
      existing.priceFrom = Math.min(existing.priceFrom, man);
      existing.priceTo = Math.max(existing.priceTo, man);
      if (!existing.fuels.includes(c.fuelType)) existing.fuels.push(c.fuelType);
    }
  }
  return [...byModel.values()];
}

export function trimIdForCar(carId: string): string | undefined {
  return cache.find((c) => c.id === carId)?.trimId;
}
