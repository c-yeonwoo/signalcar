// 신차 vs 중고차 결정 로직 (Phase A · 규칙 기반)
//
// 데이터 소스: 국내 중고 시세 공개 데이터(엔카/KB차차차)의 최근 밴드를 참조한
// 차종별 감가율 추정치. 매물 리스팅은 하지 않고, "지금 신차가 나을지 · 1년
// 무사고 중고가 나을지"의 결정을 돕는 참고 지표로만 사용합니다.

export type NewVsUsedVerdict = "new" | "used1y" | "toss";

export interface NewVsUsedResult {
  newPrice: number;
  used1y: number;
  used3y: number;
  band1y: [number, number];
  band3y: [number, number];
  retention3y: number;
  gap1yPct: number;
  gap1yAbs: number;
  verdict: NewVsUsedVerdict;
  headline: string;
  detail: string;
}

// 차종별 3년 잔가율 (한국 시장 추정치).
export function retention3yFor(bodyType: string): number {
  const t = (bodyType || "").toLowerCase();
  if (t.includes("suv")) return 0.68;
  if (t.includes("트럭") || t.includes("픽업")) return 0.72;
  if (t.includes("경") || t.includes("소형")) return 0.6;
  if (t.includes("전기") || t.includes("ev")) return 0.55;
  if (t.includes("세단")) return 0.62;
  if (t.includes("해치") || t.includes("왜건")) return 0.58;
  return 0.62;
}

const roundKRW = (v: number) => Math.round(v / 100000) * 100000;

function formatShort(v: number): string {
  const eok = v / 100000000;
  if (eok >= 1) return `${eok.toFixed(1)}억`;
  const man = Math.round(v / 10000);
  return `${man.toLocaleString()}만원`;
}

export function computeNewVsUsed(input: {
  newPrice: number;
  bodyType: string;
}): NewVsUsedResult {
  const { newPrice, bodyType } = input;
  const r3 = retention3yFor(bodyType);
  // 1년 잔가율: 3년 잔가율 + 18%p (초년 감가 반영)
  const r1 = Math.min(0.92, r3 + 0.18);

  const used1y = roundKRW(newPrice * r1);
  const used3y = roundKRW(newPrice * r3);
  const band1y: [number, number] = [roundKRW(used1y * 0.94), roundKRW(used1y * 1.06)];
  const band3y: [number, number] = [roundKRW(used3y * 0.92), roundKRW(used3y * 1.08)];

  const gap1yAbs = newPrice - used1y;
  const gap1yPct = Math.round((gap1yAbs / newPrice) * 100);

  let verdict: NewVsUsedVerdict;
  let headline: string;
  let detail: string;
  if (gap1yPct <= 8) {
    verdict = "new";
    headline = "신차가 유리";
    detail = `1년 무사고 중고 대비 프리미엄이 ${gap1yPct}%뿐이에요. 보증·프로모션·최신 옵션까지 감안하면 신차 값어치가 있습니다.`;
  } else if (gap1yPct >= 15) {
    verdict = "used1y";
    headline = "1년 무사고 중고가 합리적";
    detail = `신차보다 약 ${gap1yPct}% (${formatShort(gap1yAbs)}) 저렴. 잔가 방어보다 초년 감가가 커서 1년만 기다린 매물이 이득이에요.`;
  } else {
    verdict = "toss";
    headline = "취향에 따라";
    detail = `신차 대비 ${gap1yPct}% 차이. 보증 잔여·최신 사양 vs 절감액 ${formatShort(gap1yAbs)} 트레이드오프예요.`;
  }

  return {
    newPrice, used1y, used3y, band1y, band3y,
    retention3y: r3, gap1yPct, gap1yAbs,
    verdict, headline, detail,
  };
}

export const VERDICT_LABEL: Record<NewVsUsedVerdict, string> = {
  new: "신차 추천",
  used1y: "1년 중고 추천",
  toss: "취향 문제",
};

export const VERDICT_TONE: Record<NewVsUsedVerdict, "buy" | "wait" | "neutral"> = {
  new: "buy",
  used1y: "wait",
  toss: "neutral",
};

export const formatKRWShort = formatShort;
