import { MOCK_CARS, type MockCar } from "@/lib/mock-cars";
import { getPrefs } from "@/lib/onboarding-store";

/** 특정 차와 세그먼트/가격대가 비슷한 후보 반환. */
export function similarTo(car: MockCar, limit = 3): { car: MockCar; reason: string }[] {
  const priceBand = car.medianContract;
  return MOCK_CARS
    .filter((c) => c.id !== car.id)
    .map((c) => {
      const sameBody = c.bodyType === car.bodyType;
      const priceDiff = Math.abs(c.medianContract - priceBand) / priceBand;
      const score = (sameBody ? 2 : 0) + (priceDiff <= 0.1 ? 2 : priceDiff <= 0.2 ? 1 : 0);
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
 * - 관심 있음: 관심 세그먼트 확장.
 * - 관심 없음: 온보딩 취향 기반.
 * 항상 관심에 없는 차만.
 */
export function discoverCandidates(watchIds: string[], limit = 5): { car: MockCar; reason: string }[] {
  const watched = watchIds.map((id) => MOCK_CARS.find((c) => c.id === id)).filter((c): c is MockCar => !!c);
  const excluded = new Set(watchIds);
  const pool = MOCK_CARS.filter((c) => !excluded.has(c.id));

  if (watched.length > 0) {
    // 관심 차 중 첫번째 기준 유사도
    const base = watched[0];
    return pool
      .map((c) => {
        const sameBody = c.bodyType === base.bodyType;
        const priceDiff = Math.abs(c.medianContract - base.medianContract) / base.medianContract;
        const score = (sameBody ? 2 : 0) + (priceDiff <= 0.15 ? 2 : priceDiff <= 0.3 ? 1 : 0) + (c.signal === "buy" ? 1 : 0);
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
  const familyish = prefs?.purpose === "family" || prefs?.purpose === "leisure";
  return pool
    .map((c) => {
      const score =
        (familyish && c.bodyType.includes("SUV") ? 2 : 0) +
        (c.signal === "buy" ? 2 : c.signal === "wait" ? 0 : 1);
      const reason = familyish
        ? c.bodyType.includes("SUV")
          ? "가족·레저용 SUV 추천"
          : "다양성 후보"
        : c.signal === "buy"
          ? "이번주 시그널 좋음"
          : "인기 후보";
      return { car: c, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ car: c, reason }) => ({ car: c, reason }));
}