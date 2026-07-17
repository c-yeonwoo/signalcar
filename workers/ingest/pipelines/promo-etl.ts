/**
 * 공식 프로모션 월 ETL.
 * P1: 기아 special-offers → official_promotions + car_profiles.promo_*
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchKiaSpecialOffers, type KiaPromoOffer } from "./promo-kia";

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
  offer: KiaPromoOffer,
  trimIds: string[],
  month: string,
): Promise<number> {
  let n = 0;
  for (const trimId of trimIds) {
    for (const b of offer.benefits) {
      if (b.amount <= 0) continue;
      // 같은 trim+month+description 있으면 update — unique 제약 없음 → delete+insert 패턴 대신 select
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
  offer: KiaPromoOffer,
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
        promo_note: `기아 공식 이달의 구매 혜택 · ${offer.modelName}`,
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

export async function runPromoEtl(opts?: {
  cwd?: string;
  dryRun?: boolean;
  brand?: "kia";
  month?: string;
}) {
  const cwd = opts?.cwd ?? process.cwd();
  const month = opts?.month ?? seoulMonth();
  const brand = opts?.brand ?? "kia";

  if (brand !== "kia") {
    throw new Error(`promo-etl brand=${brand} not implemented yet (kia only)`);
  }

  const { offers, htmlPath } = await fetchKiaSpecialOffers({ cwd });
  const preview = {
    source: "promo-etl",
    brand,
    month,
    fetchedAt: new Date().toISOString(),
    htmlPath,
    stats: {
      offers: offers.length,
      withAmount: offers.filter((o) => o.headlineAmount > 0).length,
    },
    offers,
  };

  const outDir = join(cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `promo-etl-kia-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(preview, null, 2) + "\n");
  console.log(
    `[promo-etl] kia offers=${offers.length} withAmount=${preview.stats.withAmount} month=${month} → ${outPath}`,
  );

  if (opts?.dryRun) {
    return {
      ...preview.stats,
      month,
      outPath,
      dryRun: true as const,
      db: null,
      sample: offers.slice(0, 5).map((o) => ({
        model: o.modelName,
        slug: o.vehicleSlug,
        headline: o.headlineAmount,
        benefits: o.benefits.length,
      })),
    };
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[promo-etl] no SERVICE_ROLE — preview only");
    return { ...preview.stats, month, outPath, dryRun: false as const, db: null };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  let matched = 0;
  let unmatched = 0;
  let promoRows = 0;
  let profiles = 0;

  for (const offer of offers) {
    const trims = await findTrimsForVehicle(sb, offer.vehicleSlug, offer.modelName);
    if (!trims.length) {
      unmatched += 1;
      console.log(`[promo-etl] no vehicle match: ${offer.modelName} (${offer.vehicleSlug})`);
      continue;
    }
    matched += 1;
    const trimIds = trims.map((t) => t.trimId);
    promoRows += await upsertPromos(sb, offer, trimIds, month);
    profiles += await syncProfiles(sb, offer, trimIds);
  }

  const db = { matched, unmatched, promoRows, profiles };
  console.log("[promo-etl] db", db);
  return { ...preview.stats, month, outPath, dryRun: false as const, db };
}
