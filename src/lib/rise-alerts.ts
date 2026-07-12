/**
 * 스냅샷(관심 담을 때 가격) 대비 현재가가 일정 % 이상 오르면
 * 인앱 배너로 "가격 상승 경보"를 띄우기 위한 설정 저장소.
 * 채널은 인앱 배너만 (푸시/이메일은 후속 스프린트).
 */
const KEY = "sc.riseAlerts.v1";
const DEFAULT_PCT = 2;

type State = {
  /** 전역 기본 임계값 (%) */
  defaultPct: number;
  /** 차량별 임계값 override (%) */
  perCar: Record<string, number>;
  /** 사용자가 "이번 경보 확인함"으로 스누즈한 상태 (carId -> price at ack) */
  ack: Record<string, { price: number; at: number }>;
};

function read(): State {
  if (typeof window === "undefined") return { defaultPct: DEFAULT_PCT, perCar: {}, ack: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== "object") return { defaultPct: DEFAULT_PCT, perCar: {}, ack: {} };
    return {
      defaultPct: typeof obj.defaultPct === "number" ? obj.defaultPct : DEFAULT_PCT,
      perCar: obj.perCar ?? {},
      ack: obj.ack ?? {},
    };
  } catch {
    return { defaultPct: DEFAULT_PCT, perCar: {}, ack: {} };
  }
}

function write(s: State) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("sc:rise-alerts-change"));
}

export function getRiseState(): State {
  return read();
}

export function getThresholdPct(carId: string): number {
  const s = read();
  return s.perCar[carId] ?? s.defaultPct;
}

export function setDefaultPct(pct: number) {
  const s = read();
  s.defaultPct = Math.max(0.5, Math.min(20, pct));
  write(s);
}

export function setCarPct(carId: string, pct: number) {
  const s = read();
  s.perCar[carId] = Math.max(0.5, Math.min(20, pct));
  write(s);
}

export function clearCarPct(carId: string) {
  const s = read();
  delete s.perCar[carId];
  write(s);
}

/** 사용자가 배너의 "확인" 버튼을 눌러 현 가격 기준으로 스누즈. 이후 재상승 시 다시 뜬다. */
export function ackRise(carId: string, currentPrice: number) {
  const s = read();
  s.ack[carId] = { price: currentPrice, at: Date.now() };
  write(s);
}

export function clearAck(carId: string) {
  const s = read();
  delete s.ack[carId];
  write(s);
}

export type RiseTrigger = {
  carId: string;
  snapshotPrice: number;
  currentPrice: number;
  diff: number;
  pct: number;
  thresholdPct: number;
};

/**
 * 스냅샷 대비 임계값 이상 오른 차량만 반환.
 * 스누즈된 경우 스누즈 시점 가격 대비 재차 임계값 이상 올라야 다시 트리거.
 */
export function computeTriggers(
  entries: Array<{ id: string; price: number; snapshot?: { price: number; at: number } | null }>,
): RiseTrigger[] {
  const s = read();
  const out: RiseTrigger[] = [];
  for (const e of entries) {
    if (!e.snapshot) continue;
    const threshold = s.perCar[e.id] ?? s.defaultPct;
    const base = e.snapshot.price;
    if (base <= 0) continue;
    const diff = e.price - base;
    const pct = (diff / base) * 100;
    if (pct < threshold) continue;
    // 스누즈 처리: ack 시점 가격 대비 임계값만큼 다시 올라야 재알림
    const ack = s.ack[e.id];
    if (ack) {
      const reRisePct = ((e.price - ack.price) / ack.price) * 100;
      if (reRisePct < threshold) continue;
    }
    out.push({
      carId: e.id,
      snapshotPrice: base,
      currentPrice: e.price,
      diff,
      pct,
      thresholdPct: threshold,
    });
  }
  return out;
}
