import { supabase } from "@/integrations/supabase/client";
import type { CarFeatureRow, TimingVerdict } from "./types";

type DbFeature = {
  trim_id: string;
  feature_date: string;
  median_deal_price: number | null;
  p25_deal_price: number | null;
  p75_deal_price: number | null;
  sample_size: number;
  list_price: number | null;
  discount_ratio: number | null;
  promo_percentile: number | null;
  promo_amount: number | null;
  sales_registered_count: number | null;
  sales_momentum: number | null;
  days_to_facelift: number | null;
  facelift_note: string | null;
  timing_verdict: string;
  timing_score: number;
  timing_reasons: unknown;
  brain_version: string;
  computed_at: string;
};

function mapRow(r: DbFeature): CarFeatureRow {
  const reasons = Array.isArray(r.timing_reasons)
    ? (r.timing_reasons as string[])
    : typeof r.timing_reasons === "string"
      ? (() => {
          try {
            return JSON.parse(r.timing_reasons) as string[];
          } catch {
            return [];
          }
        })()
      : [];
  return {
    ...r,
    timing_verdict: (r.timing_verdict as TimingVerdict) ?? "neutral",
    timing_reasons: reasons,
  };
}

/** trim별 최신 feature_date 1행 */
export async function fetchLatestFeatures(
  trimIds: string[],
): Promise<Map<string, CarFeatureRow>> {
  const map = new Map<string, CarFeatureRow>();
  if (!trimIds.length) return map;

  const { data, error } = await supabase
    .from("car_features_daily")
    .select("*")
    .in("trim_id", trimIds)
    .order("feature_date", { ascending: false });

  if (error || !data) return map;

  for (const raw of data as DbFeature[]) {
    if (!map.has(raw.trim_id)) map.set(raw.trim_id, mapRow(raw));
  }
  return map;
}
