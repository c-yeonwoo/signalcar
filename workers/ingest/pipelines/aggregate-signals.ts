/**
 * deal_reports → price_signals 월별 집계.
 * service_role 또는 로컬 SUPABASE_SERVICE_ROLE_KEY 필요.
 */
import { createClient } from "@supabase/supabase-js";

type DealRow = {
  trim_id: string;
  contract_price: number;
  contract_month: string | null;
  verification_status: string | null;
};

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

function verdict(sample: number, promoHint?: number | null): "buy" | "wait" | "neutral" {
  if (sample < 15) return "neutral";
  if (promoHint != null && promoHint >= 70) return "buy";
  if (promoHint != null && promoHint <= 30) return "wait";
  return "neutral";
}

function monthKey(iso: string | null): string | null {
  if (!iso) return null;
  return `${iso.slice(0, 7)}-01`;
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
    .neq("verification_status", "flagged");

  if (error) throw error;

  const buckets = new Map<string, number[]>();
  for (const d of (deals ?? []) as DealRow[]) {
    const m = monthKey(d.contract_month);
    if (!m || !d.trim_id || !d.contract_price) continue;
    const k = `${d.trim_id}|${m}`;
    const arr = buckets.get(k) ?? [];
    arr.push(Number(d.contract_price));
    buckets.set(k, arr);
  }

  const rows = [...buckets.entries()].map(([k, prices]) => {
    const [trim_id, month] = k.split("|") as [string, string];
    const sample_size = prices.length;
    const median_deal_price = median(prices);
    return {
      trim_id,
      month,
      median_deal_price,
      sample_size,
      promo_percentile: null as number | null,
      timing_verdict: verdict(sample_size),
      computed_at: new Date().toISOString(),
    };
  });

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
