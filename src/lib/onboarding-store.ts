/**
 * 첫 방문 온보딩으로 수집한 구매자 취향.
 * 코치 인터뷰 프리필 / 홈 개인화에 사용.
 */
const PREF_KEY = "sc.prefs.v1";
const REVIEW_KEY = "sc.myreviews.v1";

export type BuyerPrefs = {
  purpose: "commute" | "family" | "longhaul" | "leisure";
  seats: "1-2" | "3-4" | "5+";
  mileage: "low" | "mid" | "high";
  budgetMax?: number; // 만원
  timing?: "now" | "1-3m" | "3-6m" | "browsing";
  createdAt: number;
};

export function getPrefs(): BuyerPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? (JSON.parse(raw) as BuyerPrefs) : null;
  } catch {
    return null;
  }
}

export function setPrefs(p: BuyerPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREF_KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("sc:prefs-change"));
}

export function clearPrefs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREF_KEY);
  window.dispatchEvent(new CustomEvent("sc:prefs-change"));
}

/* ----------- 내가 남긴 리뷰 (제보 → 리뷰 트리거용, 로컬 저장 데모) ----------- */

export type MyReview = {
  id: string;
  carId: string;
  rating: number; // 1-5
  pros: string;
  cons: string;
  createdAt: number;
};

export function getMyReviews(): MyReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addMyReview(r: Omit<MyReview, "id" | "createdAt">) {
  const list = getMyReviews();
  const next: MyReview = {
    ...r,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  list.unshift(next);
  window.localStorage.setItem(REVIEW_KEY, JSON.stringify(list.slice(0, 20)));
  window.dispatchEvent(new CustomEvent("sc:reviews-change"));
  return next;
}