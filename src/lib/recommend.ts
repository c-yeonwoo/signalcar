import { MOCK_CARS, type MockCar } from "@/lib/mock-cars";
import { getPrefs } from "@/lib/onboarding-store";
import { runMatch, type MatchCandidate } from "@/lib/brain";

function toCandidate(c: MockCar): MatchCandidate {
  const man = Math.round(c.listPrice / 10_000);
  return {
    id: c.id,
    brand: c.brand,
    model: c.model,
    bodyType: c.bodyType,
    priceFrom: man,
    priceTo: man,
    fuels: [c.fuelType],
    signal: c.signal,
    trimId: "trimId" in c ? (c as MockCar & { trimId?: string }).trimId : undefined,
  };
}

/** 특정 차와 세그먼트/가격대가 비슷한 후보 반환. */
export function similarTo(car: MockCar, limit = 3): { car: MockCar; reason: string }[] {
  const priceBand = car.medianContract;
  return MOCK_CARS.filter((c) => c.id !== car.id)
    .map((c) => {
      const sameBody = c.bodyType === car.bodyType;
      const priceDiff = Math.abs(c.medianContract - priceBand) / Math.max(priceBand, 1);
      const score =
        (sameBody ? 2 : 0) +
        (priceDiff <= 0.1 ? 2 : priceDiff <= 0.2 ? 1 : 0) +
        (c.signal === "buy" ? 1 : 0);
      const reason = sameBody
        ? priceDiff <= 0.1
          ? `${car.model}와 같은 세그먼트·가격대`
          : `${car.model}와 같은 ${c.bodyType}`
        : priceDiff <= 0.1
          ? `${car.model}와 같은 가격대`
          : "다른 관점 후보";
      return { car: c, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ car: c, reason }) => ({ car: c, reason }));
}

/**
 * 홈 하단 발견 캐러셀 후보.
 * Brain Match + 시그널 가중.
 */
export function discoverCandidates(
  watchIds: string[],
  limit = 5,
): { car: MockCar; reason: string }[] {
  const watched = watchIds
    .map((id) => MOCK_CARS.find((c) => c.id === id))
    .filter((c): c is MockCar => !!c);
  const excluded = new Set(watchIds);
  const pool = MOCK_CARS.filter((c) => !excluded.has(c.id));

  if (watched.length > 0) {
    const base = watched[0]!;
    return pool
      .map((c) => {
        const sameBody = c.bodyType === base.bodyType;
        const priceDiff =
          Math.abs(c.medianContract - base.medianContract) / Math.max(base.medianContract, 1);
        const score =
          (sameBody ? 2 : 0) +
          (priceDiff <= 0.15 ? 2 : priceDiff <= 0.3 ? 1 : 0) +
          (c.signal === "buy" ? 1 : 0);
        const reason = sameBody
          ? `${base.model}와 같은 ${c.bodyType}`
          : priceDiff <= 0.15
            ? `${base.model}와 비슷한 가격대`
            : `다른 옵션 · ${c.bodyType}`;
        return { car: c, score, reason };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ car: c, reason }) => ({ car: c, reason }));
  }

  const prefs = getPrefs();
  if (!prefs) {
    return pool
      .map((c) => ({
        car: c,
        score: c.signal === "buy" ? 2 : c.signal === "wait" ? 0 : 1,
        reason: c.signal === "buy" ? "이번주 시그널 좋음" : "인기 후보",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ car: c, reason }) => ({ car: c, reason }));
  }

  const budget =
    prefs.budgetMax == null
      ? undefined
      : prefs.budgetMax <= 2500
        ? ("under2500" as const)
        : prefs.budgetMax <= 4000
          ? ("2500-4000" as const)
          : prefs.budgetMax <= 6000
            ? ("4000-6000" as const)
            : ("over6000" as const);

  const timing =
    prefs.timing === "now"
      ? ("now" as const)
      : prefs.timing === "1-3m"
        ? ("1-3m" as const)
        : prefs.timing === "3-6m"
          ? ("3-6m" as const)
          : prefs.timing === "browsing"
            ? ("browsing" as const)
            : undefined;

  const { hits } = runMatch({
    answers: {
      usage: prefs.purpose,
      seats: prefs.seats,
      budget,
      timing,
    },
    candidates: pool.map(toCandidate),
    limit,
  });

  return hits
    .map((h) => {
      const car = pool.find((c) => c.id === h.id);
      if (!car) return null;
      return {
        car,
        reason: h.reasons[0] ?? (car.signal === "buy" ? "지금 타이밍 좋음" : "취향 맞춤 후보"),
      };
    })
    .filter((x): x is { car: MockCar; reason: string } => !!x);
}
