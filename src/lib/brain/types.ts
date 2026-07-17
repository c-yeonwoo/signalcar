/**
 * Brain P0 API 스키마 (요청/응답).
 * 서버 Edge가 없어도 동일 타입으로 클라이언트·워커가 공유한다.
 */

export type TimingVerdict = "buy" | "wait" | "neutral";

export type MatchAnswers = {
  budget?: "under2500" | "2500-4000" | "4000-6000" | "over6000";
  body?: "sedan" | "suv" | "van" | "any";
  seats?: "1-2" | "3-4" | "5+";
  usage?: "commute" | "family" | "longhaul" | "leisure";
  fuel?: "gasoline" | "diesel" | "hybrid" | "ev" | "any";
  timing?: "now" | "3m" | "6m+" | "1-3m" | "3-6m" | "browsing";
};

/** Match 입력 후보 (카탈로그·실차 공통) */
export type MatchCandidate = {
  id: string;
  brand: string;
  model: string;
  bodyType: string;
  /** 만원 */
  priceFrom: number;
  /** 만원 */
  priceTo: number;
  fuels: string[];
  tag?: string | null;
  signal?: TimingVerdict;
  timingScore?: number | null;
  trimId?: string;
};

export type MatchRequest = {
  answers: MatchAnswers;
  candidates: MatchCandidate[];
  limit?: number;
};

export type MatchReason = string;

export type MatchHit = {
  id: string;
  trimId?: string;
  rawScore: number;
  matchPercent: number;
  reasons: MatchReason[];
};

export type MatchResponse = {
  brainVersion: string;
  hits: MatchHit[];
};

export type TimingInput = {
  sampleSize: number;
  promoPercentile: number | null;
  discountRatio: number | null;
  daysToFacelift: number | null;
  salesMomentum: number | null;
  /** 1–31, Asia/Seoul 기준 */
  dayOfMonth?: number;
};

export type TimingResult = {
  verdict: TimingVerdict;
  score: number;
  reasons: string[];
};

export type PriceBandInput = {
  listPrice: number | null;
  medianDealPrice: number | null;
  p25DealPrice: number | null;
  p75DealPrice: number | null;
  sampleSize: number;
  promoAmount?: number | null;
};

export type PriceBand = {
  target: number | null;
  low: number | null;
  high: number | null;
  list: number | null;
  confidence: "low" | "medium" | "high";
  note: string;
};

export type CarFeatureRow = {
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
  timing_verdict: TimingVerdict;
  timing_score: number;
  timing_reasons: string[];
  brain_version: string;
  computed_at: string;
};

export type OutcomeEventType =
  | "impression"
  | "click"
  | "watch"
  | "unwatch"
  | "unlock"
  | "report"
  | "diagnose"
  | "match_result"
  | "contract_claimed";

export type OutcomeEventInput = {
  eventType: OutcomeEventType;
  trimId?: string | null;
  carSlug?: string | null;
  payload?: Record<string, unknown>;
  sessionId?: string | null;
};
