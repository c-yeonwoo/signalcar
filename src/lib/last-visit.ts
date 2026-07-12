/**
 * 마지막 방문 타임스탬프.
 * 홈에서 "지난 방문 이후 변화"를 보여주기 위해 매 세션 첫 홈 방문 때 갱신.
 */
const KEY = "sc.last-visit.v1";

export function getLastVisit(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function stampLastVisit() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, String(Date.now()));
}

/**
 * 방문 이후 경과가 하루 이상인지 (다이제스트 배너 노출 조건).
 */
export function daysSince(last: number | null): number {
  if (!last) return 999;
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}