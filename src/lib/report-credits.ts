/**
 * 계약 공유(give) → 협상 리포트 열람권(get).
 *
 * - 게스트: localStorage만
 * - 로그인: report_unlocks 하이드레이트 + spend 시 RPC unlock_briefing_with_credit
 * - deal_report 트리거로 부여된 trim 언락도 하이드레이트에 포함
 */
import { supabase } from "@/integrations/supabase/client";
import { TRIM_ID_MAP } from "@/lib/mock-cars";
import { carIdFromTrimId } from "@/lib/price-signals";
import { logOutcome } from "@/lib/brain";
import { trimIdForCar } from "@/lib/cars";

const CREDIT_KEY = "sc.reportCredits.v1";
const UNLOCK_KEY = "sc.reportUnlocks.v1";

type CreditState = { balance: number; earned: number; spent: number };

function readCredits(): CreditState {
  if (typeof window === "undefined") return { balance: 0, earned: 0, spent: 0 };
  try {
    const raw = window.localStorage.getItem(CREDIT_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (obj && typeof obj.balance === "number") return obj as CreditState;
  } catch {}
  return { balance: 0, earned: 0, spent: 0 };
}

function writeCredits(s: CreditState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREDIT_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("sc:report-credits-change"));
}

function readUnlocks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UNLOCK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeUnlocks(arr: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNLOCK_KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent("sc:report-credits-change"));
}

function mergeUnlocks(extra: string[]) {
  const cur = readUnlocks();
  const set = new Set([...cur, ...extra]);
  writeUnlocks([...set]);
}

export function getCreditBalance(): number {
  return readCredits().balance;
}

export function getCreditState(): CreditState {
  return readCredits();
}

export function earnCredit(amount = 1) {
  const s = readCredits();
  s.balance += amount;
  s.earned += amount;
  writeCredits(s);
}

export function isUnlocked(carId: string): boolean {
  return readUnlocks().includes(carId);
}

export function getUnlockedIds(): string[] {
  return readUnlocks();
}

/** 열람권 1장 소비해 언락. 로그인 시 서버에도 기록. */
export function spendCreditToUnlock(carId: string): { ok: boolean; alreadyUnlocked?: boolean } {
  const unlocks = readUnlocks();
  if (unlocks.includes(carId)) return { ok: true, alreadyUnlocked: true };
  const s = readCredits();
  if (s.balance <= 0) return { ok: false };
  s.balance -= 1;
  s.spent += 1;
  writeCredits(s);
  writeUnlocks([...unlocks, carId]);

  const trimId = trimIdForCar(carId) ?? TRIM_ID_MAP[carId];
  void logOutcome({ eventType: "unlock", carSlug: carId, trimId });
  if (trimId) {
    void (supabase as any).rpc("unlock_briefing_with_credit", { p_trim_id: trimId }).then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        console.warn("[report-credits] server unlock skipped:", error.message);
      }
    });
  }
  return { ok: true };
}

/** 로그인 시 report_unlocks → local carId 언락 병합 */
export async function hydrateUnlocksFromServer() {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return;

  const { data, error } = await supabase.from("report_unlocks").select("trim_id");
  if (error || !data) return;

  const carIds = data
    .map((r: { trim_id: string }) => carIdFromTrimId(r.trim_id))
    .filter((id: string | undefined): id is string => Boolean(id));
  if (carIds.length) mergeUnlocks(carIds);
}
