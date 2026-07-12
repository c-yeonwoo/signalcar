/**
 * 목표가 알림 저장소.
 * - 게스트: localStorage (`sc.alerts.v1`).
 * - 로그인: Supabase `price_alerts` 미러링. 매핑 없는 차종은 로컬만 유지.
 */
import { supabase } from "@/integrations/supabase/client";
import { TRIM_ID_MAP } from "@/lib/mock-cars";

const KEY = "sc.alerts.v1";

export type PriceAlert = {
  carId: string;
  targetPrice: number; // 원
  createdAt: number;
};

const TRIM_TO_CAR: Record<string, string> = Object.fromEntries(
  Object.entries(TRIM_ID_MAP).map(([carId, uuid]) => [uuid, carId]),
);

export function getAlerts(): Record<string, PriceAlert> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function getAlert(carId: string): PriceAlert | undefined {
  return getAlerts()[carId];
}

function persist(next: Record<string, PriceAlert>) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("sc:alerts-change"));
}

export function setAlert(carId: string, targetPrice: number) {
  const next = { ...getAlerts(), [carId]: { carId, targetPrice, createdAt: Date.now() } };
  persist(next);
  void mirrorSet(carId, targetPrice);
}

export function clearAlert(carId: string) {
  const next = { ...getAlerts() };
  delete next[carId];
  persist(next);
  void mirrorClear(carId);
}

async function mirrorSet(carId: string, targetPrice: number) {
  const trimId = TRIM_ID_MAP[carId];
  if (!trimId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("price_alerts").upsert(
    { user_id: user.id, trim_id: trimId, target_price: targetPrice },
    { onConflict: "user_id,trim_id" },
  );
}

async function mirrorClear(carId: string) {
  const trimId = TRIM_ID_MAP[carId];
  if (!trimId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("price_alerts").delete().eq("user_id", user.id).eq("trim_id", trimId);
}

export async function hydrateAlertsFromServer() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data, error } = await supabase.from("price_alerts").select("trim_id,target_price");
  if (error || !data) return;
  const local = getAlerts();
  const merged = { ...local };
  for (const r of data) {
    const carId = TRIM_TO_CAR[r.trim_id as string];
    if (!carId) continue;
    if (!merged[carId]) {
      merged[carId] = { carId, targetPrice: Number(r.target_price), createdAt: Date.now() };
    }
  }
  persist(merged);
  // back-fill server with locals it doesn't have
  const serverCarIds = new Set(
    data.map((r) => TRIM_TO_CAR[r.trim_id as string]).filter((x): x is string => !!x),
  );
  for (const carId of Object.keys(local)) {
    if (!serverCarIds.has(carId)) await mirrorSet(carId, local[carId].targetPrice);
  }
}

/** 목표가 대비 현재가의 근접도. */
export function alertStatus(currentPrice: number, target: number): {
  hit: boolean;
  near: boolean;
  gapPct: number; // 현재가가 목표가보다 얼마나 높은지 (%)
} {
  const gap = currentPrice - target;
  const gapPct = target === 0 ? 0 : Math.round((gap / target) * 1000) / 10;
  return { hit: gap <= 0, near: gap > 0 && gapPct <= 1, gapPct };
}