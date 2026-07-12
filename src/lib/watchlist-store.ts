/**
 * 관심 차종 저장소.
 * - 게스트: localStorage.
 * - 로그인 유저: DB(watchlist)에 best-effort 미러링 + 최초 로그인 시 서버→로컬 하이드레이션.
 *   저장 단위는 앱의 carId(=MOCK_CARS.id). DB 저장은 TRIM_ID_MAP로 UUID 매핑.
 *   매핑에 없는 항목은 로컬만 유지.
 */
import { supabase } from "@/integrations/supabase/client";
import { TRIM_ID_MAP } from "@/lib/mock-cars";
import { removeSnapshot, setSnapshotIfAbsent } from "@/lib/watch-snapshot";

const KEY = "sc.watchlist.v1";
const MAX = 5;

// carId → trimUUID 역/정 매핑
const TRIM_TO_CAR: Record<string, string> = Object.fromEntries(
  Object.entries(TRIM_ID_MAP).map(([carId, uuid]) => [uuid, carId]),
);

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

export function toggleWatch(
  id: string,
  opts?: { price?: number },
): { added: boolean; list: string[] } {
  const cur = getWatchlist();
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    setWatchlist(next);
    removeSnapshot(id);
    void mirrorRemove(id);
    return { added: false, list: next };
  }
  const next = cur.length >= MAX ? [...cur.slice(1), id] : [...cur, id];
  setWatchlist(next);
  if (typeof opts?.price === "number") setSnapshotIfAbsent(id, opts.price);
  void mirrorAdd(id);
  return { added: true, list: next };
}

/* ---------------- DB mirror (best-effort, silent on failure) ---------------- */

async function mirrorAdd(carId: string) {
  const trimId = TRIM_ID_MAP[carId];
  if (!trimId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("watchlist").upsert(
    { user_id: user.id, trim_id: trimId },
    { onConflict: "user_id,trim_id" },
  );
}

async function mirrorRemove(carId: string) {
  const trimId = TRIM_ID_MAP[carId];
  if (!trimId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("watchlist").delete().eq("user_id", user.id).eq("trim_id", trimId);
}

/**
 * 로그인 시 서버 → 로컬 병합.
 * 서버에 있지만 로컬에 없는 관심 차종을 앞쪽에 추가.
 */
export async function hydrateWatchlistFromServer() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from("watchlist").select("trim_id");
  if (error || !data) return;
  const serverCarIds = data
    .map((r) => TRIM_TO_CAR[r.trim_id as string])
    .filter((x): x is string => !!x);
  if (serverCarIds.length === 0) return;
  const local = getWatchlist();
  const merged: string[] = [];
  for (const id of [...serverCarIds, ...local]) {
    if (!merged.includes(id)) merged.push(id);
  }
  setWatchlist(merged.slice(0, MAX));
  // 로컬에만 있던 항목을 서버로 back-fill
  for (const id of local) {
    if (!serverCarIds.includes(id)) await mirrorAdd(id);
  }
}