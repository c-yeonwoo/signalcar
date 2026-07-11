/**
 * 관심 차종 로컬 저장소 (백엔드 붙이기 전 데모).
 * 최대 5대까지 유지.
 */
const KEY = "sc.watchlist.v1";
const MAX = 5;

export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function setWatchlist(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  window.dispatchEvent(new CustomEvent("sc:watchlist-change"));
}

export function toggleWatch(id: string): { added: boolean; list: string[] } {
  const cur = getWatchlist();
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    setWatchlist(next);
    return { added: false, list: next };
  }
  const next = cur.length >= MAX ? [...cur.slice(1), id] : [...cur, id];
  setWatchlist(next);
  return { added: true, list: next };
}
