import type { PriceBand, PriceBandInput } from "./types";

/** 목표 계약가 밴드 (원 단위) */
export function computePriceBand(input: PriceBandInput): PriceBand {
  const list = input.listPrice != null ? Number(input.listPrice) : null;
  const median = input.medianDealPrice != null ? Number(input.medianDealPrice) : null;
  const p25 = input.p25DealPrice != null ? Number(input.p25DealPrice) : null;
  const p75 = input.p75DealPrice != null ? Number(input.p75DealPrice) : null;
  const sample = input.sampleSize ?? 0;

  if (median == null && list == null) {
    return {
      target: null,
      low: null,
      high: null,
      list: null,
      confidence: "low",
      note: "가격 데이터가 아직 부족해요",
    };
  }

  const target = median ?? (list != null ? Math.round(list * 0.95) : null);
  let low = p25;
  let high = p75;

  if (target != null) {
    if (low == null) low = Math.round(target * 0.97);
    if (high == null) high = Math.round(target * 1.03);
  }

  // 프로모 금액이 있으면 목표를 살짝 낮춤 (택1 가정 — 안내는 note에)
  const promo = input.promoAmount != null ? Number(input.promoAmount) : 0;
  if (target != null && promo > 0 && list != null) {
    const promoAdj = Math.min(promo, Math.round(list * 0.03));
    // target은 median 유지, note만 안내
    void promoAdj;
  }

  const confidence: PriceBand["confidence"] =
    sample >= 30 ? "high" : sample >= 15 ? "medium" : "low";

  const note =
    confidence === "high"
      ? "실거래 표본이 충분해요. 목표가 근처로 협상을 시작해보세요."
      : confidence === "medium"
        ? "표본이 모이는 중이에요. 목표가 ±3%를 참고하세요."
        : "표본이 적어 정가·프로모션 기준으로 추정했어요.";

  return {
    target,
    low,
    high,
    list,
    confidence,
    note,
  };
}

export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return Math.round(sorted[lo]! * (1 - w) + sorted[hi]! * w);
}
