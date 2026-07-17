/**
 * 공식 프로모션 월 ETL.
 * P1: 기아 special-offers · 현대 monthly-benefit → official_promotions + car_profiles.promo_*
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

async function findTrimsForVehicle(
  sb: SupabaseClient,
  slug: string,
  modelName: string,
): Promise<{ trimId: string; vehicleId: string }[]> {
  const { data: bySlug } = await sb
    .from("vehicles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let vehicleId = bySlug?.id as string | undefined;
  if (!vehicleId) {
    const { data: byName } = await sb
      .from("vehicles")
      .select("id")
      .ilike("model_name", `%${modelName}%`)
      .limit(1)
      .maybeSingle();
    vehicleId = byName?.id as string | undefined;
  }
  if (!vehicleId) return [];

  const { data: trims } = await sb
    .from("trims")
    .select("id")
    .eq("vehicle_id", vehicleId);
  return (trims ?? []).map((t) => ({
    trimId: t.id as string,
    vehicleId,
  }));
}

async function upsertPromos(
  sb: SupabaseClient,
  offer: PromoOffer,
  trimIds: string[],
  month: string,
): Promise<number> {
  let n = 0;
  for (const trimId of trimIds) {
    for (const b of offer.benefits) {
      if (b.amount <= 0) continue;
      const desc = `[${b.category}] ${b.note}`.slice(0, 500);
      const { data: existing } = await sb
        .from("official_promotions")
        .select("id")
        .eq("trim_id", trimId)
        .eq("month", month)
        .eq("discount_type", b.discountType)
        .eq("amount", b.amount)
        .maybeSingle();

      if (existing?.id) {
        await sb
          .from("official_promotions")
          .update({
            description: desc,
            source_url: offer.sourceUrl,
            captured_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        const { error } = await sb.from("official_promotions").insert({
          trim_id: trimId,
          month,
          discount_type: b.discountType,
          amount: b.amount,
          description: desc,
          source_url: offer.sourceUrl,
          captured_at: new Date().toISOString(),
        });
        if (error) {
          console.warn("[promo-etl] insert", trimId, error.message);
          continue;
        }
      }
      n += 1;
    }
  }
  return n;
}

async function syncProfiles(
  sb: SupabaseClient,
  offer: PromoOffer,
  trimIds: string[],
): Promise<number> {
  if (offer.headlineAmount <= 0 || !trimIds.length) return 0;
  let n = 0;
  for (const trimId of trimIds) {
    const { data, error } = await sb
      .from("car_profiles")
      .update({
        promo_label: offer.headlineLabel,
        promo_amount: offer.headlineAmount,
        promo_note: `${offer.brand} 공식 이달의 구매 혜택 · ${offer.modelName}`,
        updated_at: new Date().toISOString(),
      })
      .eq("trim_id", trimId)
      .select("trim_id");
    if (error) {
      console.warn("[promo-etl] profile", trimId, error.message);
      continue;
    }
    if (data?.length) n += data.length;
  }
  return n;
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
  dryRun?: boolean;
  brand: "kia" | "hyundai";
  month: string;
  sb: SupabaseClient | null;
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

  if (opts.dryRun || !opts.sb) {
    return {
      brand: opts.brand,
      month,
      outPath,
      ...preview.stats,
      dryRun: Boolean(opts.dryRun || !opts.sb),
      db: null as null | {
        matched: number;
        unmatched: number;
        promoRows: number;
        profiles: number;
      },
      sample: offers.slice(0, 5).map((o) => ({
        model: o.modelName,
        slug: o.vehicleSlug,
        headline: o.headlineAmount,
        benefits: o.benefits.length,
      })),
      offerRows: offers,
    };
  }

  let matched = 0;
  let unmatched = 0;
  let promoRows = 0;
  let profiles = 0;

  for (const offer of offers) {
    const trims = await findTrimsForVehicle(opts.sb, offer.vehicleSlug, offer.modelName);
    if (!trims.length) {
      unmatched += 1;
      console.log(
        `[promo-etl] no vehicle match: ${offer.brand} ${offer.modelName} (${offer.vehicleSlug})`,
      );
      continue;
    }
    matched += 1;
    const trimIds = trims.map((t) => t.trimId);
    promoRows += await upsertPromos(opts.sb, offer, trimIds, month);
    profiles += await syncProfiles(opts.sb, offer, trimIds);
  }

  const db = { matched, unmatched, promoRows, profiles };
  console.log(`[promo-etl] ${opts.brand} db`, db);
  return {
    brand: opts.brand,
    month,
    outPath,
    ...preview.stats,
    dryRun: false as const,
    db,
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
  dryRun?: boolean;
  brand?: PromoBrand;
  month?: string;
}) {
  const cwd = opts?.cwd ?? process.cwd();
  const month = opts?.month ?? seoulMonth();
  const brand = opts?.brand ?? "all";
  const brands: ("kia" | "hyundai")[] =
    brand === "all" ? ["kia", "hyundai"] : brand === "kia" ? ["kia"] : ["hyundai"];

  let sb: SupabaseClient | null = null;
  if (!opts?.dryRun) {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn("[promo-etl] no SERVICE_ROLE — preview only");
    } else {
      sb = createClient(url, key, { auth: { persistSession: false } });
    }
  }

  const parts = [];
  for (const b of brands) {
    parts.push(await runOneBrand({ cwd, dryRun: opts?.dryRun, brand: b, month, sb }));
  }

  const offers = parts.reduce((s, p) => s + p.offers, 0);
  const withAmount = parts.reduce((s, p) => s + p.withAmount, 0);
  const db = parts.some((p) => p.db)
    ? {
        matched: parts.reduce((s, p) => s + (p.db?.matched ?? 0), 0),
        unmatched: parts.reduce((s, p) => s + (p.db?.unmatched ?? 0), 0),
        promoRows: parts.reduce((s, p) => s + (p.db?.promoRows ?? 0), 0),
        profiles: parts.reduce((s, p) => s + (p.db?.profiles ?? 0), 0),
      }
    : null;

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
    dryRun: Boolean(opts?.dryRun || !sb),
    db,
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
