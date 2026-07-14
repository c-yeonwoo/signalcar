/**
 * 다나와 신차 판매조건 → SignalCar Benefit 형태 정규화.
 *
 *   GET /newcar/?Work=sales&Brand={id}&Screen=terms{modelId}
 *
 * 출력: workers/ingest/out/ 만 (gitignore). 제품 DB 적재 없음.
 * 일시불/할부 탭(Work=cash|finance)은 JS 렌더라 판매조건 표의 금리·할인을 우선 사용.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://mauto.danawa.com";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) App/iPhone/3.0.69 (Auto, 2)";

export type BenefitCategory =
  | "cash"
  | "finance"
  | "card"
  | "tradein"
  | "loyalty"
  | "group"
  | "eco"
  | "gift";

export type SignalCarBenefit = {
  id: string;
  category: BenefitCategory;
  title: string;
  amount: number;
  note: string;
  stackable: boolean;
  source: "official" | "dealer" | "external";
};

export type DanawaSalesTermRow = {
  label: string;
  raw: string;
};

export type DanawaSalesSnapshot = {
  source: "danawa-sales";
  fetchedAt: string;
  brandId: string;
  modelId: string;
  modelName: string;
  priceRangeMan?: string;
  period?: string;
  url: string;
  rows: DanawaSalesTermRow[];
  benefits: SignalCarBenefit[];
  note: string;
};

async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*",
      Referer: `${BASE}/newcar/?Work=sales`,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`danawa sales HTTP ${res.status} ${url}`);
  return await res.text();
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractLiBlock(html: string, modelId: string): string | null {
  const id = `terms${modelId}`;
  const re = new RegExp(
    `<li class=['"]salesInfo['"] id=['"]${id}['"]>([\\s\\S]*?)</li>\\s*(?=<li class=['"]salesInfo['"]|</ul>)`,
    "i",
  );
  return html.match(re)?.[1] ?? null;
}

function parsePeriod(text: string): string | undefined {
  const m = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]!.padStart(2, "0")}`;
}

function parseRows(block: string): DanawaSalesTermRow[] {
  const table = block.match(/<table[^>]*class=['"]salesTable['"][^>]*>([\s\S]*?)<\/table>/i);
  if (!table) return [];
  const rows: DanawaSalesTermRow[] = [];
  for (const tr of table[1]!.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) =>
      stripTags(c[1]!),
    );
    if (cells.length < 2) continue;
    const label = cells[0]!;
    const raw = cells.slice(1).join(" ").trim();
    if (!label || !raw) continue;
    rows.push({ label, raw });
  }
  return rows;
}

function classifyCategory(label: string, raw: string): BenefitCategory {
  const t = `${label} ${raw}`;
  if (/카드|일시불|캐시백/.test(t)) return "card";
  if (/할부|모빌리티|금리|리스|이자/.test(t)) return "finance";
  if (/트레이드|기변|매각|노후|보상/.test(t)) return "tradein";
  if (/재구매|패밀리|멤버십|기존\s*고객/.test(t)) return "loyalty";
  if (/법인|렌트|단체|우대타겟|키맨/.test(t)) return "group";
  if (/보조금|개소세|취득세|친환경|세제/.test(t)) return "eco";
  if (/사은|패키지|블랙박스|매트/.test(t)) return "gift";
  if (/할인|현금/.test(t)) return "cash";
  return "cash";
}

/** 기본 할인조건은 택1 — 다나와 안내와 동일하게 cash/finance는 비스택. */
function isStackable(category: BenefitCategory, label: string): boolean {
  if (category === "cash" || category === "finance") return false;
  if (/기본조건/.test(label)) return false;
  return true;
}

function parseDiscountAmounts(raw: string): { amount: number; condition: string }[] {
  const out: { amount: number; condition: string }[] = [];
  const re = /(\d+)\s*만\s*원\s*할인\s*(?:\(([^)]+)\))?/g;
  for (const m of raw.matchAll(re)) {
    out.push({
      amount: Number(m[1]) * 10_000,
      condition: (m[2] ?? "").trim(),
    });
  }
  return out;
}

function parseFinanceRates(raw: string): { rate: string; months: string }[] {
  const out: { rate: string; months: string }[] = [];
  for (const m of raw.matchAll(/(\d+(?:\.\d+)?)\s*%\s*\((\d+)\s*개월\)/g)) {
    out.push({ rate: m[1]!, months: m[2]! });
  }
  return out;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function rowsToBenefits(
  rows: DanawaSalesTermRow[],
  opts: { modelId: string; period?: string },
): SignalCarBenefit[] {
  const benefits: SignalCarBenefit[] = [];
  let idx = 0;

  for (const row of rows) {
    const category = classifyCategory(row.label, row.raw);
    const stackable = isStackable(category, row.label);
    const periodNote = opts.period ? `${opts.period} 기준` : "";

    const rates = parseFinanceRates(row.raw);
    if (rates.length && category === "finance") {
      const primary = rates[0]!;
      const allRates = rates.map((r) => `${r.rate}%(${r.months}개월)`).join(" / ");
      benefits.push({
        id: `dnw-${opts.modelId}-fin-${idx++}`,
        category: "finance",
        title: `${row.label} ${primary.rate}% (${primary.months}개월)`,
        amount: 0,
        note: [allRates, periodNote, "기본 할인조건 택1"].filter(Boolean).join(" · "),
        stackable: false,
        source: "official",
      });
      continue;
    }

    const discounts = parseDiscountAmounts(row.raw);
    if (discounts.length) {
      // 같은 라벨 내 조건별 옵션 → 최대 금액 1건 + note에 대안 요약 (UI 과밀 방지)
      const best = discounts.reduce((a, b) => (a.amount >= b.amount ? a : b));
      const alts = discounts
        .map((d) => `${(d.amount / 10_000).toFixed(0)}만${d.condition ? ` (${d.condition})` : ""}`)
        .join(" / ");
      benefits.push({
        id: `dnw-${opts.modelId}-${slug(row.label)}-${idx++}`,
        category,
        title: row.label,
        amount: best.amount,
        note: [alts, periodNote, stackable ? "조건 충족 시" : "기본 할인조건 택1"]
          .filter(Boolean)
          .join(" · "),
        stackable,
        source: "official",
      });
      continue;
    }

    // 금액 파싱 실패 — 원문 note로 보존
    benefits.push({
      id: `dnw-${opts.modelId}-${slug(row.label)}-${idx++}`,
      category,
      title: row.label,
      amount: 0,
      note: [row.raw.slice(0, 160), periodNote].filter(Boolean).join(" · "),
      stackable,
      source: "official",
    });
  }

  return benefits;
}

export async function fetchDanawaSalesTerms(opts: {
  brandId: string;
  modelId: string;
}): Promise<DanawaSalesSnapshot> {
  const url = `${BASE}/newcar/?Work=sales&Brand=${opts.brandId}&Screen=terms${opts.modelId}`;
  const html = await getHtml(url);
  const block = extractLiBlock(html, opts.modelId);
  if (!block) {
    throw new Error(`salesInfo terms${opts.modelId} not found on ${url}`);
  }

  const modelName =
    block.match(/alt=['"]([^'"]+)['"]/)?.[1]?.trim() ||
    stripTags(block.match(/<div class=['"]title['"]>([\s\S]*?)<\/div>/i)?.[1] ?? "") ||
    `model-${opts.modelId}`;
  const priceRangeMan = stripTags(
    block.match(/<div class=['"]price['"]>([\s\S]*?)<\/div>/i)?.[1] ?? "",
  ).replace(/\s*만원\s*$/, "") || undefined;
  const contentsText = stripTags(
    block.match(/<div class=['"]contents['"]>([\s\S]*?)$/i)?.[1] ?? block,
  );
  const period = parsePeriod(contentsText);
  const rows = parseRows(block);
  const benefits = rowsToBenefits(rows, { modelId: opts.modelId, period });

  return {
    source: "danawa-sales",
    fetchedAt: new Date().toISOString(),
    brandId: opts.brandId,
    modelId: opts.modelId,
    modelName,
    priceRangeMan: priceRangeMan || undefined,
    period,
    url,
    rows,
    benefits,
    note: "개인/로컬 조사. 제품 DB·공식 표기 전 정책 검토 필요. 기본 할인조건은 택1.",
  };
}

/** 앱 프리뷰용 — Benefit[]만 추출한 경량 JSON */
export function toPreviewPayload(snap: DanawaSalesSnapshot) {
  return {
    vehicleId: "hyundai-grandeur",
    danawaModelId: snap.modelId,
    brandId: snap.brandId,
    modelName: snap.modelName,
    period: snap.period,
    fetchedAt: snap.fetchedAt,
    sourceUrl: snap.url,
    benefits: snap.benefits,
  };
}

export function writeSalesSnapshot(cwd: string, snap: DanawaSalesSnapshot) {
  const dir = join(cwd, "workers/ingest/out");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `danawa-sales-${snap.modelId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(snap, null, 2));
  return path;
}
