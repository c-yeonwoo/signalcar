/**
 * 비교함 로컬스토리지 (전역 상태).
 * 최대 3대까지 유지, 최신 담기 우선.
 */
const KEY = "sc.compare.v1";
const MAX = 3;

export function getCompareList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function setCompareList(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent("sc:compare-change"));
}

export function toggleCompare(id: string): { added: boolean; list: string[] } {
  const cur = getCompareList();
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    setCompareList(next);
    return { added: false, list: next };
  }
  const next = cur.length >= MAX ? [...cur.slice(1), id] : [...cur, id];
  setCompareList(next);
  return { added: true, list: next };
}