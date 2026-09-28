/**
 * 첫 방문 온보딩으로 수집한 구매자 취향.
 * 게스트: localStorage / 로그인: buyer_prefs 미러.
 */
import { supabase } from "@/integrations/supabase/client";

const PREF_KEY = "sc.prefs.v1";

export type BuyerPrefs = {
  purpose: "commute" | "family" | "longhaul" | "leisure";
  seats: "1-2" | "3-4" | "5+";
  mileage: "low" | "mid" | "high";
  budgetMax?: number; // 만원
  timing?: "now" | "1-3m" | "3-6m" | "browsing";
  bodyPref?: "sedan" | "suv" | "van" | "any";
  fuelPref?: "gasoline" | "hybrid" | "ev" | "any";
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
  void mirrorPrefsToServer(p);
}

export function clearPrefs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PREF_KEY);
  window.dispatchEvent(new CustomEvent("sc:prefs-change"));
}

async function mirrorPrefsToServer(p: BuyerPrefs) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("buyer_prefs").upsert(
      {
        user_id: user.id,
        purpose: p.purpose,
        seats: p.seats,
        mileage: p.mileage,
        budget_max: p.budgetMax ?? null,
        timing: p.timing ?? null,
        body_pref: p.bodyPref ?? null,
        fuel_pref: p.fuelPref ?? null,
        answers: p as unknown as import("@/integrations/supabase/types").Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  } catch {
    /* silent */
  }
}

/** 로그인 시 서버 → 로컬 (로컬이 더 최신이면 로컬 유지 후 서버 백필) */
export async function hydratePrefsFromServer() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("buyer_prefs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) {
      const local = getPrefs();
      if (local) await mirrorPrefsToServer(local);
      return;
    }
    const local = getPrefs();
    const serverAt = data.updated_at ? new Date(data.updated_at).getTime() : 0;
    if (local && local.createdAt > serverAt) {
      await mirrorPrefsToServer(local);
      return;
    }
    const next: BuyerPrefs = {
      purpose: (data.purpose as BuyerPrefs["purpose"]) ?? "commute",
      seats: (data.seats as BuyerPrefs["seats"]) ?? "3-4",
      mileage: (data.mileage as BuyerPrefs["mileage"]) ?? "mid",
      budgetMax: data.budget_max ?? undefined,
      timing: (data.timing as BuyerPrefs["timing"]) ?? undefined,
      bodyPref: (data.body_pref as BuyerPrefs["bodyPref"]) ?? undefined,
      fuelPref: (data.fuel_pref as BuyerPrefs["fuelPref"]) ?? undefined,
      createdAt: serverAt || Date.now(),
    };
    window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("sc:prefs-change"));
  } catch {
    /* silent */
  }
}
