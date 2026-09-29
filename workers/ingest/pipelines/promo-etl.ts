/**
 * 공식 프로모션 원문 미리보기.
 * 기아 special-offers · 현대 monthly-benefit 원문 미리보기.
 * 트림 매칭과 조건별 할인액 검증 전에는 DB에 자동 반영하지 않는다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchKiaSpecialOffers, type KiaPromoOffer } from "./promo-kia";
import { fetchHyundaiMonthlyBenefits, type HyundaiPromoOffer } from "./promo-hyundai";

export type PromoBrand = "kia" | "hyundai" | "all";
export type PromoOffer = KiaPromoOffer | HyundaiPromoOffer;

function seoulMonth(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

async function loadOffers(
  brand: "kia" | "hyundai",
  cwd: string,
): Promise<{
  offers: PromoOffer[];
  artifactPath?: string;
  monthHint: string | null;
}> {
  if (brand === "kia") {
    const { offers, htmlPath } = await fetchKiaSpecialOffers({ cwd });
    return { offers, artifactPath: htmlPath, monthHint: null };
  }
  const { offers, jsonPath, monthHint } = await fetchHyundaiMonthlyBenefits({ cwd });
  return { offers, artifactPath: jsonPath, monthHint };
}

async function runOneBrand(opts: {
  cwd: string;
  brand: "kia" | "hyundai";
  month: string;
}) {
  const { offers, artifactPath, monthHint } = await loadOffers(opts.brand, opts.cwd);
  const month = monthHint ?? opts.month;

  const preview = {
    source: "promo-etl",
    brand: opts.brand,
    month,
    fetchedAt: new Date().toISOString(),
    artifactPath,
    stats: {
      offers: offers.length,
      withAmount: offers.filter((o) => o.headlineAmount > 0).length,
    },
    offers,
  };

  const outDir = join(opts.cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `promo-etl-${opts.brand}-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(preview, null, 2) + "\n");
  console.log(
    `[promo-etl] ${opts.brand} offers=${offers.length} withAmount=${preview.stats.withAmount} month=${month} → ${outPath}`,
  );

  return {
    brand: opts.brand,
    month,
    outPath,
    ...preview.stats,
    dryRun: true as const,
    db: null,
    sample: offers.slice(0, 5).map((o) => ({
      model: o.modelName,
      slug: o.vehicleSlug,
      headline: o.headlineAmount,
      benefits: o.benefits.length,
    })),
    offerRows: offers,
  };
}

export async function runPromoEtl(opts?: {
  cwd?: string;
  brand?: PromoBrand;
  month?: string;
}) {
  const cwd = opts?.cwd ?? process.cwd();
  const month = opts?.month ?? seoulMonth();
  const brand = opts?.brand ?? "all";
  const brands: ("kia" | "hyundai")[] =
    brand === "all" ? ["kia", "hyundai"] : brand === "kia" ? ["kia"] : ["hyundai"];

  const parts = [];
  for (const b of brands) {
    parts.push(await runOneBrand({ cwd, brand: b, month }));
  }

  const offers = parts.reduce((s, p) => s + p.offers, 0);
  const withAmount = parts.reduce((s, p) => s + p.withAmount, 0);
  // loop fingerprint용 — 브랜드별 헤드라인 요약
  const fingerprintOffers = parts.flatMap((p) =>
    (p.offerRows ?? []).map((o) => ({
      brand: o.brand,
      slug: o.vehicleSlug,
      headline: o.headlineAmount,
    })),
  );

  return {
    brand,
    month: parts[0]?.month ?? month,
    offers,
    withAmount,
    outPath: parts.map((p) => p.outPath).join(","),
    dryRun: true as const,
    db: null,
    sample: parts.flatMap((p) => p.sample),
    brands: parts.map((p) => ({
      brand: p.brand,
      month: p.month,
      offers: p.offers,
      withAmount: p.withAmount,
      db: p.db,
    })),
    fingerprintOffers,
  };
}
