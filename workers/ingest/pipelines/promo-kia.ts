/**
 * 기아 공식 「이 달의 구매 혜택」HTML → 정규화 행.
 * https://www.kia.com/kr/buy/special-offers
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseManAmount } from "../lib/promo-amount";
import { slugify } from "../lib/parse-price-pdf";

export { parseManAmount } from "../lib/promo-amount";

const PAGE = "https://www.kia.com/kr/buy/special-offers";
const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

export type KiaPromoBenefit = {
  category: "기본 혜택" | "특별 혜택" | "기타 혜택" | "트레이드인 혜택" | string;
  amount: number; // 원 (구간이면 최대값)
  note: string;
  discountType: "cash" | "finance" | "trade_in" | "other";
};

export type KiaPromoOffer = {
  brand: "기아";
  modelName: string;
  modelCode: string | null;
  vehicleSlug: string;
  listPriceHint: number | null;
  benefits: KiaPromoBenefit[];
  /** 스택 가능 현금성 합산(기본+특별) — UI promo_amount 후보 */
  headlineAmount: number;
  headlineLabel: string;
  sourceUrl: string;
};

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function discountTypeOf(category: string): KiaPromoBenefit["discountType"] {
  if (category.includes("트레이드")) return "trade_in";
  if (category.includes("금융") || category.includes("할부")) return "finance";
  if (category.includes("기본") || category.includes("특별")) return "cash";
  return "other";
}

function modelSlug(name: string): string {
  const map: Record<string, string> = {
    쏘렌토: "sorento",
    카니발: "carnival",
    "카니발 하이리무진": "carnival-hi-limousine",
    셀토스: "seltos",
    스포티지: "sportage",
    니로: "niro",
    모닝: "morning",
    레이: "ray",
    "레이 EV": "ray-ev",
    EV3: "ev3",
    EV4: "ev4",
    EV5: "ev5",
    EV6: "ev6",
    "EV6 GT": "ev6-gt",
    EV9: "ev9",
    K5: "k5",
    K8: "k8",
    K9: "k9",
    타스만: "tasman",
  };
  return map[name] ?? slugify(name);
}

export function parseKiaSpecialOffersHtml(html: string, sourceUrl = PAGE): KiaPromoOffer[] {
  const items = html.split(/<li class="buy_accordion_item[^"]*">/i).slice(1);
  const out: KiaPromoOffer[] = [];

  for (const raw of items) {
    const name = raw.match(/buy_car_name[^>]*>\s*([^<]+)/i)?.[1]?.trim();
    if (!name) continue;

    const code =
      raw.match(/data-model-name="[^"|]+\|([^"]+)"/i)?.[1] ??
      raw.match(/rcCode=([A-Z0-9]+)/i)?.[1] ??
      null;

    const priceRaw = raw.match(/class="price">\s*([\d,]+)/i)?.[1];
    const listPriceHint = priceRaw ? Number(priceRaw.replace(/,/g, "")) : null;

    const benefits: KiaPromoBenefit[] = [];
    const sectionRe =
      /benefit_detail_tit[^>]*>\s*([^<]+?)\s*<[\s\S]*?benefit_detail_cont([\s\S]*?)(?=<div class="benefit_detail_item"|<div class="cmp-notice|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = sectionRe.exec(raw))) {
      const category = m[1]!.trim();
      const note = stripTags(m[2]!).slice(0, 200);
      if (!category) continue;
      // "-" only
      if (/^[\-\s]+$/.test(note) || note === "-") {
        benefits.push({
          category,
          amount: 0,
          note: "",
          discountType: discountTypeOf(category),
        });
        continue;
      }
      benefits.push({
        category,
        amount: parseManAmount(note),
        note,
        discountType: discountTypeOf(category),
      });
    }

    const cashStack = benefits
      .filter((b) => b.discountType === "cash" && b.amount > 0)
      .reduce((s, b) => s + b.amount, 0);
    const top = [...benefits].filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount)[0];
    const headlineAmount = cashStack > 0 ? cashStack : (top?.amount ?? 0);
    const headlineLabel =
      cashStack > 0
        ? "이달 기본·특별 혜택"
        : top
          ? top.category
          : "기아 이달의 구매 혜택";

    out.push({
      brand: "기아",
      modelName: name,
      modelCode: code,
      vehicleSlug: modelSlug(name),
      listPriceHint,
      benefits: benefits.filter((b) => b.amount > 0 || b.note.length > 0),
      headlineAmount,
      headlineLabel,
      sourceUrl,
    });
  }

  // dedupe by slug (keep first)
  const seen = new Set<string>();
  return out.filter((o) => {
    if (seen.has(o.vehicleSlug)) return false;
    seen.add(o.vehicleSlug);
    return true;
  });
}

export async function fetchKiaSpecialOffers(opts?: {
  fetchImpl?: typeof fetch;
  cwd?: string;
}): Promise<{ offers: KiaPromoOffer[]; htmlPath?: string }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const res = await fetchImpl(PAGE, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`kia special-offers HTTP ${res.status}`);
  const html = await res.text();

  let htmlPath: string | undefined;
  if (opts?.cwd) {
    const dir = join(opts.cwd, "workers/ingest/out");
    mkdirSync(dir, { recursive: true });
    htmlPath = join(dir, `kia-special-offers-${Date.now()}.html`);
    writeFileSync(htmlPath, html);
  }

  return { offers: parseKiaSpecialOffersHtml(html, PAGE), htmlPath };
}
