/**
 * 관심 담을 때의 "가격 스냅샷" 저장소 (localStorage).
 * 담을 때 가격을 기록해두고, 이후 현재가와 비교해 델타를 보여준다.
 */
const KEY = "sc.watchSnapshots.v1";

export type WatchSnapshot = { price: number; at: number };
type SnapMap = Record<string, WatchSnapshot>;

function read(): SnapMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? (obj as SnapMap) : {};
  } catch {
    return {};
  }
}

function write(map: SnapMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("sc:watch-snapshot-change"));
}

export function getSnapshot(id: string): WatchSnapshot | null {
  const m = read();
  return m[id] ?? null;
}

export function getAllSnapshots(): SnapMap {
  return read();
}

/** 이미 존재하면 덮어쓰지 않는다 (담은 시점 가격 유지). */
export function setSnapshotIfAbsent(id: string, price: number) {
  const m = read();
  if (m[id]) return;
  m[id] = { price, at: Date.now() };
  write(m);
}

export function removeSnapshot(id: string) {
  const m = read();
  if (!(id in m)) return;
  delete m[id];
  write(m);
}

/** 사용자가 명시적으로 "지금 가격으로 재캡처"할 때. */
export function recaptureSnapshot(id: string, price: number) {
  const m = read();
  m[id] = { price, at: Date.now() };
  write(m);
}

export function daysSinceSnapshot(at: number): number {
  return Math.max(0, Math.floor((Date.now() - at) / 86_400_000));
}

export function relativeAgo(at: number): string {
  const d = daysSinceSnapshot(at);
  if (d === 0) return "오늘 담음";
  if (d === 1) return "어제 담음";
  if (d < 7) return `${d}일 전 담음`;
  if (d < 30) return `${Math.floor(d / 7)}주 전 담음`;
  return `${Math.floor(d / 30)}개월 전 담음`;
}