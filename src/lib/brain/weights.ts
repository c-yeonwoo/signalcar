import { supabase } from "@/integrations/supabase/client";

export type MatchWeights = {
  budget_in: number;
  budget_overlap: number;
  budget_miss: number;
  body_match: number;
  body_miss: number;
  seats_5plus: number;
  seats_12: number;
  usage_family: number;
  usage_leisure: number;
  usage_commute: number;
  usage_longhaul: number;
  fuel_match: number;
  fuel_miss: number;
  timing_now_buy: number;
  timing_now_wait: number;
  timing_now_score: number;
  timing_later_wait: number;
  timing_later_buy: number;
  tag_hot: number;
  tag_discount: number;
};

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  budget_in: 35,
  budget_overlap: 18,
  budget_miss: -18,
  body_match: 22,
  body_miss: -8,
  seats_5plus: 14,
  seats_12: 10,
  usage_family: 12,
  usage_leisure: 12,
  usage_commute: 10,
  usage_longhaul: 8,
  fuel_match: 18,
  fuel_miss: -14,
  timing_now_buy: 12,
  timing_now_wait: -8,
  timing_now_score: 6,
  timing_later_wait: 6,
  timing_later_buy: 2,
  tag_hot: 4,
  tag_discount: 3,
};

let cache: { weights: MatchWeights; version: string; at: number } | null = null;
const CACHE_MS = 5 * 60_000;

export function mergeMatchWeights(partial: Partial<MatchWeights> | null | undefined): MatchWeights {
  return { ...DEFAULT_MATCH_WEIGHTS, ...(partial ?? {}) };
}

/** 활성 match 가중치 (실패 시 기본값) */
export async function loadActiveMatchWeights(): Promise<{
  weights: MatchWeights;
  version: string;
}> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return { weights: cache.weights, version: cache.version };
  }
  try {
    const { data, error } = await supabase
      .from("brain_weights")
      .select("version, weights")
      .eq("scope", "match")
      .eq("active", true)
      .maybeSingle();
    if (!error && data?.weights) {
      const weights = mergeMatchWeights(data.weights as Partial<MatchWeights>);
      cache = { weights, version: data.version as string, at: now };
      return { weights, version: data.version as string };
    }
  } catch {
    /* fallback */
  }
  cache = { weights: DEFAULT_MATCH_WEIGHTS, version: "default", at: now };
  return { weights: DEFAULT_MATCH_WEIGHTS, version: "default" };
}

export function invalidateMatchWeightsCache() {
  cache = null;
}

/** 학습 시 클램프: 기본값의 0.7x ~ 1.4x */
export function clampLearnedWeight(key: keyof MatchWeights, value: number): number {
  const base = DEFAULT_MATCH_WEIGHTS[key];
  const sign = base < 0 ? -1 : 1;
  const absBase = Math.abs(base);
  const absVal = Math.abs(value);
  const lo = absBase * 0.7;
  const hi = absBase * 1.4;
  const clamped = Math.min(hi, Math.max(lo, absVal));
  return sign * Math.round(clamped * 10) / 10;
}
