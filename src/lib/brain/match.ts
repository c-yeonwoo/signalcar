import { BRAIN_VERSION } from "./version";
import { DEFAULT_MATCH_WEIGHTS, type MatchWeights } from "./weights";
import type {
  MatchAnswers,
  MatchCandidate,
  MatchHit,
  MatchRequest,
  MatchResponse,
} from "./types";

const BUDGET_RANGE: Record<NonNullable<MatchAnswers["budget"]>, [number, number]> = {
  under2500: [0, 2500],
  "2500-4000": [2500, 4000],
  "4000-6000": [4000, 6000],
  over6000: [6000, 20000],
};

const MAX_SCORE = 120;

/** 예산·차체·좌석·용도·연료·타이밍 가중 스코어 */
export function scoreCandidate(
  c: MatchCandidate,
  a: MatchAnswers,
  w: MatchWeights = DEFAULT_MATCH_WEIGHTS,
): number {
  let s = 0;

  if (a.budget) {
    const [lo, hi] = BUDGET_RANGE[a.budget];
    const mid = (c.priceFrom + c.priceTo) / 2;
    if (mid >= lo && mid <= hi) s += w.budget_in;
    else if (c.priceFrom <= hi && c.priceTo >= lo) s += w.budget_overlap;
    else s += w.budget_miss;
  }

  if (a.body && a.body !== "any") {
    const b = c.bodyType;
    const match =
      (a.body === "sedan" && b.includes("세단")) ||
      (a.body === "suv" && b.includes("SUV")) ||
      (a.body === "van" && b.includes("미니밴"));
    s += match ? w.body_match : w.body_miss;
  }

  if (a.seats === "5+" && (c.bodyType.includes("미니밴") || c.bodyType.includes("대형"))) {
    s += w.seats_5plus;
  }
  if (
    a.seats === "1-2" &&
    (c.bodyType.includes("소형") || c.bodyType.includes("준중형") || c.bodyType.includes("경형"))
  ) {
    s += w.seats_12;
  }

  if (a.usage === "family" && (c.bodyType.includes("SUV") || c.bodyType.includes("미니밴"))) {
    s += w.usage_family;
  }
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) s += w.usage_leisure;
  if (
    a.usage === "commute" &&
    (c.bodyType.includes("세단") || c.bodyType.includes("소형") || c.bodyType.includes("준중형"))
  ) {
    s += w.usage_commute;
  }
  if (a.usage === "longhaul" && (c.bodyType.includes("세단") || c.bodyType.includes("프리미엄"))) {
    s += w.usage_longhaul;
  }

  if (a.fuel && a.fuel !== "any") {
    if (c.fuels.includes(a.fuel)) s += w.fuel_match;
    else s += w.fuel_miss;
  }

  if (a.timing === "now" || a.timing === "1-3m") {
    if (c.signal === "buy") s += w.timing_now_buy;
    else if (c.signal === "wait") s += w.timing_now_wait;
    if (c.timingScore != null && c.timingScore >= 20) s += w.timing_now_score;
  } else if (a.timing === "3m" || a.timing === "3-6m" || a.timing === "6m+") {
    if (c.signal === "wait") s += w.timing_later_wait;
    if (c.signal === "buy") s += w.timing_later_buy;
  }

  if (c.tag === "hot") s += w.tag_hot;
  if (c.tag === "discount") s += w.tag_discount;

  return s;
}

export function reasonsFor(c: MatchCandidate, a: MatchAnswers): string[] {
  const bits: string[] = [];
  if (a.body && a.body !== "any") {
    const match =
      (a.body === "sedan" && c.bodyType.includes("세단")) ||
      (a.body === "suv" && c.bodyType.includes("SUV")) ||
      (a.body === "van" && c.bodyType.includes("미니밴"));
    if (match) bits.push(c.bodyType);
  }
  if (a.fuel && a.fuel !== "any" && c.fuels.includes(a.fuel)) {
    const label =
      a.fuel === "ev" ? "전기" : a.fuel === "hybrid" ? "하이브리드" : a.fuel === "diesel" ? "디젤" : "가솔린";
    bits.push(`${label} 옵션`);
  }
  if (a.usage === "family" && (c.bodyType.includes("SUV") || c.bodyType.includes("미니밴"))) {
    bits.push("가족 실용성");
  }
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) bits.push("레저 활용도");
  if (a.usage === "commute" && (c.bodyType.includes("세단") || c.bodyType.includes("준중형"))) {
    bits.push("출퇴근 최적");
  }
  if ((a.timing === "now" || a.timing === "1-3m") && c.signal === "buy") {
    bits.push("지금 사기 좋은 타이밍");
  }
  if ((a.timing === "3m" || a.timing === "6m+" || a.timing === "3-6m") && c.signal === "wait") {
    bits.push("조금 더 지켜볼 타이밍");
  }
  return bits.slice(0, 4);
}

function normalizedMatch(score: number, topScore: number): number {
  const clamped = Math.max(0, Math.min(MAX_SCORE, score));
  const rel = topScore > 0 ? clamped / Math.max(topScore, 1) : 0;
  return Math.round(60 + rel * 39);
}

export function runMatch(
  req: MatchRequest,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
): MatchResponse {
  const limit = req.limit ?? 3;
  const scored = req.candidates
    .map((c) => ({
      c,
      raw: scoreCandidate(c, req.answers, weights),
    }))
    .sort((a, b) => b.raw - a.raw)
    .slice(0, limit);

  const top = scored[0]?.raw ?? 0;
  const hits: MatchHit[] = scored.map(({ c, raw }) => ({
    id: c.id,
    trimId: c.trimId,
    rawScore: raw,
    matchPercent: normalizedMatch(raw, top),
    reasons: reasonsFor(c, req.answers),
  }));

  return { brainVersion: BRAIN_VERSION, hits };
}
