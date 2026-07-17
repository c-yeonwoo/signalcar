export { BRAIN_VERSION } from "./version";
export { computeTiming, daysUntilFaceliftMonth } from "./timing";
export { runMatch, scoreCandidate, reasonsFor } from "./match";
export { computePriceBand, percentile } from "./price";
export { logOutcome } from "./outcomes";
export { fetchLatestFeatures } from "./features";
export { explainCarTiming } from "./explain-car";
export type {
  MatchAnswers,
  MatchCandidate,
  MatchRequest,
  MatchResponse,
  MatchHit,
  TimingVerdict,
  TimingInput,
  TimingResult,
  PriceBand,
  PriceBandInput,
  CarFeatureRow,
  OutcomeEventType,
  OutcomeEventInput,
} from "./types";
