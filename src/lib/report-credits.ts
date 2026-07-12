/**
 * 계약 공유(give) → 협상 리포트 열람권(get) 인센티브 저장소.
 * MVP는 localStorage 기반. 서버 검증 붙기 전까지 클라이언트 상태만 관리.
 *
 * - 공유 1건당 열람권 +1
 * - 열람권 1장으로 특정 차량의 협상 리포트 언락 (영구)
 */
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

/** 열람권을 1장 소비해 언락. 잔량 부족이면 false. 이미 언락돼있으면 true(무료). */
export function spendCreditToUnlock(carId: string): { ok: boolean; alreadyUnlocked?: boolean } {
  const unlocks = readUnlocks();
  if (unlocks.includes(carId)) return { ok: true, alreadyUnlocked: true };
  const s = readCredits();
  if (s.balance <= 0) return { ok: false };
  s.balance -= 1;
  s.spent += 1;
  writeCredits(s);
  writeUnlocks([...unlocks, carId]);
  return { ok: true };
}