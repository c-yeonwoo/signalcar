/**
 * 과거 car_features_daily 예측 vs 이후 중앙값 변화 → timing_evals.
 * WAIT 후 하락 / BUY 후 상승 등을 correct|miss|unknown으로 라벨.
 */
import { createClient } from "@supabase/supabase-js";

type FeatureRow = {
  trim_id: string;
  feature_date: string;
  timing_verdict: string;
  timing_score: number;
  median_deal_price: number | null;
  brain_version: string;
};

type SignalRow = {
  trim_id: string;
  month: string;
  median_deal_price: number | null;
};

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function labelVerdict(
  predicted: string,
  changeRatio: number | null,
): "correct" | "miss" | "unknown" {
  if (changeRatio == null || !Number.isFinite(changeRatio)) return "unknown";
  // 가격 하락 = 구매자 유리
  if (predicted === "wait") {
    if (changeRatio <= -0.01) return "correct"; // 기다렸더니 내려감
    if (changeRatio >= 0.02) return "miss"; // 올랐으면 wait 이득 없음
    return "unknown";
  }
  if (predicted === "buy") {
    if (changeRatio <= 0.015) return "correct"; // 산 뒤 크게 안 오름
    if (changeRatio >= 0.04) return "miss"; // 산 직후 급등 = 타이밍 아쉬움
    return "unknown";
  }
  return "unknown";
}

export async function evaluateTimingPredictions(opts?: {
  dryRun?: boolean;
  /** 예측일로부터 며칠 후를 평가할지 */
  horizonDays?: number;
  /** 최소 경과 일수 (예측일이 너무 최근이면 스킵) */
  minAgeDays?: number;
}) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const horizon = opts?.horizonDays ?? 30;
  const minAge = opts?.minAgeDays ?? horizon;
  const cutoff = addDays(new Date().toISOString().slice(0, 10), -minAge);

  const { data: features, error } = await sb
    .from("car_features_daily")
    .select(
      "trim_id, feature_date, timing_verdict, timing_score, median_deal_price, brain_version",
    )
    .lte("feature_date", cutoff)
    .in("timing_verdict", ["buy", "wait"])
    .order("feature_date", { ascending: false })
    .limit(500);
  if (error) throw error;

  const rows = (features ?? []) as FeatureRow[];
  const trimIds = [...new Set(rows.map((r) => r.trim_id))];
  const { data: signals } = trimIds.length
    ? await sb
        .from("price_signals")
        .select("trim_id, month, median_deal_price")
        .in("trim_id", trimIds)
        .order("month", { ascending: false })
    : { data: [] as SignalRow[] };

  const latestMedian = new Map<string, number>();
  for (const s of (signals ?? []) as SignalRow[]) {
    if (latestMedian.has(s.trim_id)) continue;
    if (s.median_deal_price != null) latestMedian.set(s.trim_id, Number(s.median_deal_price));
  }

  const evals = rows.map((r) => {
    const after = latestMedian.get(r.trim_id) ?? null;
    const before = r.median_deal_price != null ? Number(r.median_deal_price) : null;
    const changeRatio =
      before != null && after != null && before > 0 ? (after - before) / before : null;
    const actual_label = labelVerdict(r.timing_verdict, changeRatio);
    return {
      trim_id: r.trim_id,
      feature_date: r.feature_date,
      predicted_verdict: r.timing_verdict,
      predicted_score: r.timing_score,
      brain_version: r.brain_version,
      median_at_prediction: before,
      median_after: after,
      price_change_ratio: changeRatio,
      actual_label,
      payload: { horizonDays: horizon },
      evaluated_at: new Date().toISOString(),
    };
  });

  const summary = {
    candidates: evals.length,
    correct: evals.filter((e) => e.actual_label === "correct").length,
    miss: evals.filter((e) => e.actual_label === "miss").length,
    unknown: evals.filter((e) => e.actual_label === "unknown").length,
  };
  console.log("[timing-eval]", summary);

  if (opts?.dryRun) {
    return { dryRun: true as const, summary, sample: evals.slice(0, 5) };
  }

  if (!evals.length) return { dryRun: false as const, summary, upserted: 0 };

  const { error: upErr } = await sb.from("timing_evals").upsert(evals, {
    onConflict: "trim_id,feature_date,brain_version",
  });
  if (upErr) throw upErr;

  return { dryRun: false as const, summary, upserted: evals.length };
}
