/**
 * 관심 차종 저장소.
 * - 게스트: localStorage.
 * - 로그인 유저: DB(watchlist)에 best-effort 미러링 + 최초 로그인 시 서버→로컬 하이드레이션.
 *   저장 단위는 앱의 carId(=slug). DB는 live trimId 사용.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchCarsFromDb, getCars, trimIdForCar } from "@/lib/cars";
import { TRIM_ID_MAP } from "@/lib/mock-cars";
import { removeSnapshot, setSnapshotIfAbsent } from "@/lib/watch-snapshot";
import { logOutcome } from "@/lib/brain";

const KEY = "sc.watchlist.v1";
const MAX = 5;

function resolveTrimId(carId: string): string | undefined {
  return trimIdForCar(carId) ?? TRIM_ID_MAP[carId];
}

function trimToCarId(trimId: string): string | undefined {
  const live = getCars().find((c) => c.trimId === trimId);
  if (live) return live.id;
  const legacy = Object.entries(TRIM_ID_MAP).find(([, uuid]) => uuid === trimId);
  return legacy?.[0];
}

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
    void logOutcome({ eventType: "unwatch", carSlug: id, trimId: resolveTrimId(id) });
    return { added: false, list: next };
  }
  const next = cur.length >= MAX ? [...cur.slice(1), id] : [...cur, id];
  setWatchlist(next);
  if (typeof opts?.price === "number") setSnapshotIfAbsent(id, opts.price);
  void mirrorAdd(id);
  void logOutcome({ eventType: "watch", carSlug: id, trimId: resolveTrimId(id) });
  return { added: true, list: next };
}

/* ---------------- DB mirror (best-effort, silent on failure) ---------------- */

async function mirrorAdd(carId: string) {
  const trimId = resolveTrimId(carId);
  if (!trimId) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("watchlist").upsert(
    { user_id: user.id, trim_id: trimId },
    { onConflict: "user_id,trim_id" },
  );
}

async function mirrorRemove(carId: string) {
  const trimId = resolveTrimId(carId);
  if (!trimId) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("watchlist").delete().eq("user_id", user.id).eq("trim_id", trimId);
}

/**
 * 로그인 시 서버 → 로컬 병합.
 * 서버에 있지만 로컬에 없는 관심 차종을 앞쪽에 추가.
 */
export async function hydrateWatchlistFromServer() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await fetchCarsFromDb();
  const { data, error } = await supabase.from("watchlist").select("trim_id");
  if (error || !data) return;
  const serverCarIds = data
    .map((r: { trim_id: string }) => trimToCarId(r.trim_id))
    .filter((x: string | undefined): x is string => !!x);
  if (serverCarIds.length === 0) {
    const local = getWatchlist();
    for (const id of local) await mirrorAdd(id);
    return;
  }
  const local = getWatchlist();
  const merged: string[] = [];
  for (const id of [...serverCarIds, ...local]) {
    if (!merged.includes(id)) merged.push(id);
  }
  setWatchlist(merged.slice(0, MAX));
  for (const id of local) {
    if (!serverCarIds.includes(id)) await mirrorAdd(id);
  }
}
