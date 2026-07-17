/**
 * 현대 공식 「이달의 구매혜택」GW API → 정규화 행.
 * 페이지: https://www.hyundai.com/kr/ko/e/vehicles/monthly-benefit
 * API: GET .../customer-support/common/benefit/cars?imageSectionCode=01
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseManAmount } from "../lib/promo-amount";
import { slugify } from "../lib/parse-price-pdf";

const PAGE = "https://www.hyundai.com/kr/ko/e/vehicles/monthly-benefit";
const API =
  "https://www.hyundai.com/kr/ko/gw/customer-support/v1/customer-support/common/benefit/cars?imageSectionCode=01";
const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

export type HyundaiPromoBenefit = {
  category: string;
  amount: number;
  note: string;
  discountType: "cash" | "finance" | "trade_in" | "other";
};

export type HyundaiPromoOffer = {
  brand: "현대";
  modelName: string;
  modelCode: string | null;
  vehicleSlug: string;
  listPriceHint: number | null;
  benefits: HyundaiPromoBenefit[];
  headlineAmount: number;
  headlineLabel: string;
  sourceUrl: string;
  criterionMonth: string | null;
};

type ApiDiscount = {
  benefitTypeName?: string | null;
  benefitContents?: string | null;
  benefitDetail?: string | null;
  benefitTypeCode?: string | null;
};

type ApiCar = {
  carCode?: string;
  carName?: string;
  carEngName?: string;
  carLowPrice?: string | number | null;
  criterionMonth?: string | null;
  discountList?: ApiDiscount[] | null;
};

function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vehicleSlugFrom(car: ApiCar): string {
  const eng = (car.carEngName ?? "").trim() || slugify(car.carName ?? "unknown");
  return slugify(eng.replace(/^the-/, "").replace(/^the-all-new-/, "all-new-"));
}

function discountTypeOf(
  category: string,
  note: string,
): HyundaiPromoBenefit["discountType"] {
  if (category.includes("트레이드") || note.includes("트레이드")) return "trade_in";
  if (category.includes("금리") || category.includes("금융") || category.includes("할부")) {
    return "finance";
  }
  if (
    category.includes("기본") ||
    category.includes("생산월") ||
    category.includes("특별")
  ) {
    return "cash";
  }
  return "other";
}

function amountFromDiscount(d: ApiDiscount): { amount: number; note: string } {
  const contents = (d.benefitContents ?? "").trim();
  const detail = stripTags(d.benefitDetail ?? "");
  const noteParts = [contents, detail].filter((s) => s && s !== "-");
  const note = noteParts.join(" · ").slice(0, 200);
  // 금액은 contents 우선, 없으면 detail (최대할인 등)
  const amount = parseManAmount(contents) || parseManAmount(detail);
  return { amount, note };
}

/** API JSON → offers. 테스트·dry-run용 순수 파서. */
export function parseHyundaiBenefitCars(
  payload: { data?: ApiCar[] } | ApiCar[],
  sourceUrl = PAGE,
): HyundaiPromoOffer[] {
  const cars = Array.isArray(payload) ? payload : (payload.data ?? []);
  const out: HyundaiPromoOffer[] = [];

  for (const car of cars) {
    const name = (car.carName ?? "").trim();
    if (!name) continue;

    const benefits: HyundaiPromoBenefit[] = [];
    let maxDiscount = 0;

    for (const d of car.discountList ?? []) {
      const category = (d.benefitTypeName ?? "").trim();
      if (!category) continue;

      // UI 「최대할인」은 헤드라인 집계 — 개별 행으로는 넣지 않음 (이중 집계 방지)
      if (category === "최대할인") {
        const { amount } = amountFromDiscount(d);
        if (amount > maxDiscount) maxDiscount = amount;
        continue;
      }

      const { amount, note } = amountFromDiscount(d);
      if (amount <= 0 && (!note || note === "-")) continue;

      benefits.push({
        category,
        amount,
        note,
        discountType: discountTypeOf(category, note),
      });
    }

    const cashStack = benefits
      .filter((b) => b.discountType === "cash" && b.amount > 0)
      .reduce((s, b) => s + b.amount, 0);
    const headlineAmount = maxDiscount > 0 ? maxDiscount : cashStack;
    const headlineLabel =
      maxDiscount > 0
        ? "이달 최대 할인"
        : cashStack > 0
          ? "이달 기본·생산월 혜택"
          : "현대 이달의 구매 혜택";

    const priceRaw = car.carLowPrice;
    const listPriceHint =
      priceRaw != null && String(priceRaw).trim() !== ""
        ? Number(String(priceRaw).replace(/,/g, ""))
        : null;

    out.push({
      brand: "현대",
      modelName: name,
      modelCode: car.carCode ?? null,
      vehicleSlug: vehicleSlugFrom(car),
      listPriceHint: Number.isFinite(listPriceHint) ? listPriceHint : null,
      benefits: benefits.filter((b) => b.amount > 0 || b.note.length > 0),
      headlineAmount,
      headlineLabel,
      sourceUrl,
      criterionMonth: car.criterionMonth ?? null,
    });
  }

  const seen = new Set<string>();
  return out.filter((o) => {
    const key = o.vehicleSlug || o.modelName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** criterionMonth `202607` → `2026-07-01` */
export function criterionMonthToDate(criterionMonth: string | null | undefined): string | null {
  const m = criterionMonth?.match(/^(\d{4})(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-01`;
}

export async function fetchHyundaiMonthlyBenefits(opts?: {
  fetchImpl?: typeof fetch;
  cwd?: string;
}): Promise<{ offers: HyundaiPromoOffer[]; jsonPath?: string; monthHint: string | null }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const res = await fetchImpl(API, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "Accept-Language": "ko-KR,ko;q=0.9",
      Referer: PAGE,
    },
  });
  if (!res.ok) throw new Error(`hyundai benefit/cars HTTP ${res.status}`);
  const json = (await res.json()) as { data?: ApiCar[] };

  let jsonPath: string | undefined;
  if (opts?.cwd) {
    const dir = join(opts.cwd, "workers/ingest/out");
    mkdirSync(dir, { recursive: true });
    jsonPath = join(dir, `hyundai-benefit-cars-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");
  }

  const offers = parseHyundaiBenefitCars(json, PAGE);
  const monthHint =
    criterionMonthToDate(offers.find((o) => o.criterionMonth)?.criterionMonth) ?? null;
  return { offers, jsonPath, monthHint };
}
