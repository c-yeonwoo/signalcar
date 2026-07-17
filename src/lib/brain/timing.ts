import type { TimingInput, TimingResult, TimingVerdict } from "./types";

/**
 * Timing 규칙 v1 — 숫자 피처만으로 BUY/WAIT/NEUTRAL.
 * LLM 판단 금지. 이유는 사람이 읽을 짧은 문자열.
 */
export function computeTiming(input: TimingInput): TimingResult {
  let score = 0;
  const reasons: string[] = [];

  const sample = input.sampleSize ?? 0;
  if (sample >= 30) {
    score += 15;
    reasons.push(`실거래 표본 ${sample}건으로 신뢰도 확보`);
  } else if (sample >= 15) {
    score += 10;
    reasons.push(`실거래 표본 ${sample}건`);
  } else if (sample > 0) {
    score -= 5;
    reasons.push(`표본 ${sample}건 — 아직 참고용`);
  } else {
    score -= 8;
    reasons.push("실거래 표본이 거의 없어요");
  }

  const promo = input.promoPercentile;
  if (promo != null) {
    if (promo >= 70) {
      score += 25;
      reasons.push("이번 달 프로모션이 평소보다 좋아요");
    } else if (promo >= 55) {
      score += 10;
      reasons.push("프로모션이 평균 이상이에요");
    } else if (promo <= 30) {
      score -= 20;
      reasons.push("프로모션이 약한 달이에요");
    } else if (promo <= 40) {
      score -= 10;
      reasons.push("프로모션이 평소보다 아쉬워요");
    }
  }

  const disc = input.discountRatio;
  if (disc != null && Number.isFinite(disc)) {
    if (disc >= 0.08) {
      score += 15;
      reasons.push("정가 대비 실계약 할인폭이 큰 편");
    } else if (disc >= 0.05) {
      score += 8;
      reasons.push("정가 대비 할인폭이 괜찮은 편");
    } else if (disc <= 0.02 && disc >= 0) {
      score -= 5;
      reasons.push("정가에 가깝게 거래되는 편");
    }
  }

  const days = input.daysToFacelift;
  if (days != null && days >= 0) {
    if (days <= 90) {
      score -= 25;
      reasons.push(`연식변경·페이스리프트까지 약 ${days}일 — 대기 검토`);
    } else if (days <= 180) {
      score -= 10;
      reasons.push(`연식변경까지 약 ${days}일`);
    }
  }

  const mom = input.salesMomentum;
  if (mom != null && Number.isFinite(mom)) {
    if (mom > 0.15) {
      score -= 10;
      reasons.push("판매가 빠르게 늘고 있어 할인 여지가 적을 수 있어요");
    } else if (mom < -0.15) {
      score += 10;
      reasons.push("판매가 둔화되어 딜러 프로모션 여지가 커질 수 있어요");
    }
  }

  const day = input.dayOfMonth ?? new Date().getDate();
  if (day >= 25) {
    score += 5;
    reasons.push("월말 — 재고·실적 압박으로 조건이 나아질 때가 많아요");
  }

  const verdict = scoreToVerdict(score, sample);
  return { verdict, score, reasons: reasons.slice(0, 4) };
}

function scoreToVerdict(score: number, sample: number): TimingVerdict {
  // 표본이 극히 적으면 강한 BUY/WAIT를 막음
  if (sample < 5 && Math.abs(score) < 30) return "neutral";
  if (score >= 20) return "buy";
  if (score <= -15) return "wait";
  return "neutral";
}

/** facelift jsonb { month: "YYYY-MM", note } → days */
export function daysUntilFaceliftMonth(
  facelift: { month?: string | null } | null | undefined,
  from = new Date(),
): number | null {
  const m = facelift?.month;
  if (!m || !/^\d{4}-\d{2}/.test(m)) return null;
  const [y, mo] = m.slice(0, 7).split("-").map(Number);
  if (!y || !mo) return null;
  const target = new Date(y, mo - 1, 1);
  const ms = target.getTime() - from.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}
