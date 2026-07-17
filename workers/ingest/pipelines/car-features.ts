/**
 * car_profiles + price_signals + deal_reports + sales_stats + promotions
 * → car_features_daily (+ price_signals.timing_verdict 동기화)
 */
import { createClient } from "@supabase/supabase-js";
import { BRAIN_VERSION } from "../../../src/lib/brain/version";
import { computeTiming, daysUntilFaceliftMonth } from "../../../src/lib/brain/timing";
import { percentile } from "../../../src/lib/brain/price";

type ProfileRow = {
  trim_id: string;
  promo_amount: number | null;
  facelift: { month?: string; note?: string } | null;
  trim: { base_price: number | null } | null;
};

type SignalRow = {
  trim_id: string;
  month: string;
  median_deal_price: number | null;
  sample_size: number;
  promo_percentile: number | null;
};

type DealRow = {
  trim_id: string;
  contract_price: number;
  contract_month: string | null;
  verification_status: string | null;
};

type SalesRow = {
  trim_id: string;
  month: string;
  registered_count: number | null;
};

type PromoRow = {
  trim_id: string;
  month: string;
  amount: number | null;
};

function seoulToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function seoulDayOfMonth(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", day: "numeric" }).format(
      new Date(),
    ),
  );
}

function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  return `${iso.slice(0, 7)}-01`;
}

function currentMonthKey(): string {
  const d = seoulToday();
  return `${d.slice(0, 7)}-01`;
}

export async function buildCarFeatures(opts?: { dryRun?: boolean; syncSignals?: boolean }) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const featureDate = seoulToday();
  const month = currentMonthKey();
  const dayOfMonth = seoulDayOfMonth();
  const syncSignals = opts?.syncSignals !== false;

  const { data: profiles, error: pErr } = await sb
    .from("car_profiles")
    .select("trim_id, promo_amount, facelift, trim:trims(base_price)")
    .eq("published", true);
  if (pErr) throw pErr;

  const trimIds = ((profiles ?? []) as ProfileRow[]).map((p) => p.trim_id);
  if (!trimIds.length) {
    return { upserted: 0, dryRun: !!opts?.dryRun, featureDate, rows: [] as unknown[] };
  }

  const [{ data: signals }, { data: deals }, { data: sales }, { data: promos }] = await Promise.all([
    sb
      .from("price_signals")
      .select("trim_id, month, median_deal_price, sample_size, promo_percentile")
      .in("trim_id", trimIds)
      .order("month", { ascending: false }),
    sb
      .from("deal_reports")
      .select("trim_id, contract_price, contract_month, verification_status")
      .in("trim_id", trimIds)
      .neq("verification_status", "flagged"),
    sb
      .from("sales_stats")
      .select("trim_id, month, registered_count")
      .in("trim_id", trimIds)
      .order("month", { ascending: false }),
    sb
      .from("official_promotions")
      .select("trim_id, month, amount")
      .in("trim_id", trimIds)
      .order("month", { ascending: false }),
  ]);

  const latestSignal = new Map<string, SignalRow>();
  for (const s of (signals ?? []) as SignalRow[]) {
    if (!latestSignal.has(s.trim_id)) latestSignal.set(s.trim_id, s);
  }

  const pricesByTrim = new Map<string, number[]>();
  for (const d of (deals ?? []) as DealRow[]) {
    const m = monthKey(d.contract_month);
    if (!m || m !== month) continue;
    const arr = pricesByTrim.get(d.trim_id) ?? [];
    arr.push(Number(d.contract_price));
    pricesByTrim.set(d.trim_id, arr);
  }

  const salesByTrim = new Map<string, SalesRow[]>();
  for (const s of (sales ?? []) as SalesRow[]) {
    const arr = salesByTrim.get(s.trim_id) ?? [];
    if (arr.length < 3) arr.push(s);
    salesByTrim.set(s.trim_id, arr);
  }

  const promoByTrim = new Map<string, PromoRow>();
  for (const p of (promos ?? []) as PromoRow[]) {
    if (!promoByTrim.has(p.trim_id)) promoByTrim.set(p.trim_id, p);
  }

  const rows = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const sig = latestSignal.get(profile.trim_id);
    const listPrice = profile.trim?.base_price != null ? Number(profile.trim.base_price) : null;
    const monthPrices = (pricesByTrim.get(profile.trim_id) ?? []).sort((a, b) => a - b);
    const sampleSize = monthPrices.length || sig?.sample_size || 0;
    const median =
      monthPrices.length > 0
        ? percentile(monthPrices, 0.5)
        : sig?.median_deal_price != null
          ? Number(sig.median_deal_price)
          : null;
    const p25 = monthPrices.length >= 4 ? percentile(monthPrices, 0.25) : null;
    const p75 = monthPrices.length >= 4 ? percentile(monthPrices, 0.75) : null;

    const discountRatio =
      listPrice && median != null && listPrice > 0
        ? (listPrice - median) / listPrice
        : null;

    const promoRow = promoByTrim.get(profile.trim_id);
    const promoAmount =
      promoRow?.amount != null
        ? Number(promoRow.amount)
        : profile.promo_amount != null
          ? Number(profile.promo_amount)
          : null;

    let promoPercentile =
      sig?.promo_percentile != null ? Number(sig.promo_percentile) : null;
    const promoAmountRatio =
      promoAmount != null && listPrice && listPrice > 0 ? promoAmount / listPrice : null;
    // 프로모 금액만 있고 percentile 없으면 거친 추정 (정가 대비)
    if (promoPercentile == null && promoAmountRatio != null) {
      promoPercentile = Math.max(5, Math.min(95, Math.round(promoAmountRatio * 800)));
    }

    const salesRows = salesByTrim.get(profile.trim_id) ?? [];
    const latestSales = salesRows[0]?.registered_count ?? null;
    let salesMomentum: number | null = null;
    if (
      salesRows.length >= 2 &&
      salesRows[0]?.registered_count != null &&
      salesRows[1]?.registered_count != null &&
      salesRows[1].registered_count > 0
    ) {
      salesMomentum =
        (Number(salesRows[0].registered_count) - Number(salesRows[1].registered_count)) /
        Number(salesRows[1].registered_count);
    }

    const days = daysUntilFaceliftMonth(profile.facelift);
    const timing = computeTiming({
      sampleSize,
      promoPercentile,
      discountRatio,
      daysToFacelift: days,
      salesMomentum,
      dayOfMonth,
      promoAmountRatio,
    });

    return {
      trim_id: profile.trim_id,
      feature_date: featureDate,
      median_deal_price: median,
      p25_deal_price: p25,
      p75_deal_price: p75,
      sample_size: sampleSize,
      list_price: listPrice,
      discount_ratio: discountRatio,
      promo_percentile: promoPercentile,
      promo_amount: promoAmount,
      sales_registered_count: latestSales != null ? Number(latestSales) : null,
      sales_momentum: salesMomentum,
      days_to_facelift: days,
      facelift_note: profile.facelift?.note ?? null,
      timing_verdict: timing.verdict,
      timing_score: timing.score,
      timing_reasons: timing.reasons,
      brain_version: BRAIN_VERSION,
      computed_at: new Date().toISOString(),
    };
  });

  console.log(
    `[car-features] date=${featureDate} rows=${rows.length} brain=${BRAIN_VERSION}`,
  );

  if (opts?.dryRun) {
    console.log(rows.slice(0, 5));
    return { upserted: 0, dryRun: true as const, featureDate, rows };
  }

  const { error: upErr } = await sb.from("car_features_daily").upsert(rows, {
    onConflict: "trim_id,feature_date",
  });
  if (upErr) throw upErr;

  if (syncSignals) {
    const signalRows = rows
      .filter((r) => r.sample_size > 0 || r.median_deal_price != null)
      .map((r) => ({
        trim_id: r.trim_id,
        month,
        median_deal_price: r.median_deal_price,
        sample_size: r.sample_size,
        promo_percentile: r.promo_percentile,
        timing_verdict: r.timing_verdict,
        computed_at: r.computed_at,
      }));
    if (signalRows.length) {
      const { error: sigErr } = await sb.from("price_signals").upsert(signalRows, {
        onConflict: "trim_id,month",
      });
      if (sigErr) console.warn("[car-features] price_signals sync", sigErr.message);
    }
  }

  return { upserted: rows.length, dryRun: false as const, featureDate, rows };
}
