/**
 * car_profiles + reviewed MSRP + verified deal_reports + sales_stats
 * → car_features_daily (+ price_signals.timing_verdict 동기화)
 */
import { createClient } from "@supabase/supabase-js";
import { BRAIN_VERSION } from "../../../src/lib/brain/version";
import { computeTiming, daysUntilFaceliftMonth } from "../../../src/lib/brain/timing";
import { percentile } from "../../../src/lib/brain/price";

type ProfileRow = {
  trim_id: string;
  facelift: { month?: string; note?: string } | null;
};

type MsrpRow = {
  trim_id: string;
  amount_won: number;
};

type DealRow = {
  trim_id: string;
  contract_price: number;
  contract_month: string | null;
};

type SalesRow = {
  trim_id: string;
  month: string;
  registered_count: number | null;
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
    .select("trim_id, facelift")
    .eq("published", true);
  if (pErr) throw pErr;

  const trimIds = ((profiles ?? []) as ProfileRow[]).map((p) => p.trim_id);
  if (!trimIds.length) {
    return { upserted: 0, dryRun: !!opts?.dryRun, featureDate, rows: [] as unknown[] };
  }

  const [{ data: msrps, error: msrpError }, { data: deals, error: dealError }, { data: sales, error: salesError }] = await Promise.all([
    sb
      .from("current_trim_msrp")
      .select("trim_id, amount_won")
      .in("trim_id", trimIds),
    sb
      .from("deal_reports")
      .select("trim_id, contract_price, contract_month")
      .in("trim_id", trimIds)
      .eq("verification_status", "receipt_verified"),
    sb
      .from("sales_stats")
      .select("trim_id, month, registered_count")
      .in("trim_id", trimIds)
      .order("month", { ascending: false }),
  ]);
  if (msrpError) throw msrpError;
  if (dealError) throw dealError;
  if (salesError) throw salesError;

  const msrpByTrim = new Map(((msrps ?? []) as MsrpRow[]).map((row) => [row.trim_id, Number(row.amount_won)]));

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

  const rows = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const listPrice = msrpByTrim.get(profile.trim_id) ?? null;
    const monthPrices = (pricesByTrim.get(profile.trim_id) ?? []).sort((a, b) => a - b);
    const sampleSize = monthPrices.length;
    const median = sampleSize > 0 ? percentile(monthPrices, 0.5) : null;
    const p25 = monthPrices.length >= 4 ? percentile(monthPrices, 0.25) : null;
    const p75 = monthPrices.length >= 4 ? percentile(monthPrices, 0.75) : null;

    const discountRatio =
      listPrice && median != null && listPrice > 0
        ? (listPrice - median) / listPrice
        : null;

    const promoAmount = null;
    const promoPercentile = null;
    const promoAmountRatio = null;

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
      .filter((r) => (pricesByTrim.get(r.trim_id)?.length ?? 0) > 0)
      .map((r) => ({
        trim_id: r.trim_id,
        month,
        median_deal_price: r.median_deal_price,
        sample_size: r.sample_size,
        promo_percentile: r.promo_percentile,
        timing_verdict: r.timing_verdict,
        evidence_kind: "verified_contract" as const,
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
