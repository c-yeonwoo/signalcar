/**
 * deal_reports → price_signals 월별 집계.
 * service_role 또는 로컬 SUPABASE_SERVICE_ROLE_KEY 필요.
 */
import { createClient } from "@supabase/supabase-js";
import { percentile } from "../../../src/lib/brain/price";

type DealRow = {
  trim_id: string;
  contract_price: number;
  contract_month: string | null;
  verification_status: string | null;
};

function monthKey(iso: string | null): string | null {
  if (!iso || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(iso)) return null;
  return `${iso.slice(0, 7)}-01`;
}

export function buildVerifiedPriceSignalRows(deals: DealRow[], computedAt: string) {
  const buckets = new Map<string, number[]>();
  for (const deal of deals) {
    if (deal.verification_status !== "receipt_verified") continue;
    const month = monthKey(deal.contract_month);
    const price = Number(deal.contract_price);
    if (!month || !deal.trim_id || !Number.isFinite(price) || price <= 0) continue;
    const key = `${deal.trim_id}|${month}`;
    const prices = buckets.get(key) ?? [];
    prices.push(price);
    buckets.set(key, prices);
  }

  return [...buckets.entries()].map(([key, prices]) => {
    const [trim_id, month] = key.split("|") as [string, string];
    const sorted = prices.sort((a, b) => a - b);
    return {
      trim_id,
      month,
      median_deal_price: percentile(sorted, 0.5),
      sample_size: sorted.length,
      promo_percentile: null as number | null,
      timing_verdict: "neutral" as const,
      computed_at: computedAt,
    };
  });
}

export async function aggregatePriceSignals(opts?: { dryRun?: boolean }) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: deals, error } = await sb
    .from("deal_reports")
    .select("trim_id, contract_price, contract_month, verification_status")
    .eq("verification_status", "receipt_verified");

  if (error) throw error;

  const rows = buildVerifiedPriceSignalRows((deals ?? []) as DealRow[], new Date().toISOString());

  console.log(`[aggregate-signals] buckets=${rows.length} deals=${deals?.length ?? 0}`);

  if (opts?.dryRun) {
    console.log(rows.slice(0, 10));
    return { upserted: 0, dryRun: true as const, rows };
  }

  if (!rows.length) return { upserted: 0, dryRun: false as const, rows };

  const { error: upErr } = await sb.from("price_signals").upsert(rows, {
    onConflict: "trim_id,month",
  });
  if (upErr) throw upErr;

  return { upserted: rows.length, dryRun: false as const, rows };
}
