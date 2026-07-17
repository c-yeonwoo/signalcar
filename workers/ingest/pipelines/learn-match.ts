/**
 * outcome_events → Match 가중치 소폭 보정 → brain_weights 새 버전 활성화.
 */
import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_MATCH_WEIGHTS,
  clampLearnedWeight,
  mergeMatchWeights,
  type MatchWeights,
} from "../../../src/lib/brain/weights";
import { BRAIN_VERSION } from "../../../src/lib/brain/version";

type OutcomeRow = {
  event_type: string;
  car_slug: string | null;
  trim_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ProfileLite = {
  slug: string;
  body_type_label: string | null;
  trim_id: string;
};

function nudge(w: MatchWeights, key: keyof MatchWeights, factor: number) {
  w[key] = clampLearnedWeight(key, w[key] * factor);
}

export async function learnMatchWeights(opts?: { dryRun?: boolean; days?: number }) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const days = opts?.days ?? 28;
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: activeRow } = await sb
    .from("brain_weights")
    .select("version, weights")
    .eq("scope", "match")
    .eq("active", true)
    .maybeSingle();

  const base = mergeMatchWeights(
    (activeRow?.weights as Partial<MatchWeights> | null) ?? DEFAULT_MATCH_WEIGHTS,
  );
  const next: MatchWeights = { ...base };

  const { data: outcomes, error } = await sb
    .from("outcome_events")
    .select("event_type, car_slug, trim_id, payload, created_at")
    .gte("created_at", since)
    .in("event_type", ["watch", "unwatch", "match_result", "click", "unlock", "report"]);
  if (error) throw error;

  const rows = (outcomes ?? []) as OutcomeRow[];
  const watches = rows.filter((r) => r.event_type === "watch");
  const unwatches = rows.filter((r) => r.event_type === "unwatch");
  const matches = rows.filter((r) => r.event_type === "match_result");
  const unlocks = rows.filter((r) => r.event_type === "unlock");
  const reports = rows.filter((r) => r.event_type === "report");

  const slugs = [
    ...new Set(
      [...watches, ...unwatches, ...unlocks, ...reports]
        .map((r) => r.car_slug)
        .filter((x): x is string => !!x),
    ),
  ];

  const { data: profiles } = slugs.length
    ? await sb
        .from("car_profiles")
        .select("slug, body_type_label, trim_id")
        .in("slug", slugs)
    : { data: [] as ProfileLite[] };

  const bySlug = new Map((profiles as ProfileLite[] | null)?.map((p) => [p.slug, p]) ?? []);

  // 관심 추가 신호
  let suvWatches = 0;
  let sedanWatches = 0;
  for (const w of watches) {
    const p = w.car_slug ? bySlug.get(w.car_slug) : null;
    const body = p?.body_type_label ?? "";
    if (body.includes("SUV")) suvWatches += 1;
    if (body.includes("세단")) sedanWatches += 1;
  }

  if (suvWatches >= 3) {
    nudge(next, "body_match", 1.05);
    nudge(next, "usage_family", 1.06);
    nudge(next, "usage_leisure", 1.05);
  }
  if (sedanWatches >= 3) {
    nudge(next, "usage_commute", 1.05);
    nudge(next, "usage_longhaul", 1.04);
  }

  // match_result top hit → 이후 watch 여부
  let topHitWatched = 0;
  let topHitMissed = 0;
  for (const m of matches) {
    const hits = (m.payload as { hits?: { id: string }[] } | null)?.hits;
    const topId = hits?.[0]?.id;
    if (!topId) continue;
    const laterWatch = watches.some(
      (w) => w.car_slug === topId && w.created_at > m.created_at,
    );
    if (laterWatch) topHitWatched += 1;
    else topHitMissed += 1;
  }
  if (topHitWatched + topHitMissed >= 5) {
    const hitRate = topHitWatched / (topHitWatched + topHitMissed);
    if (hitRate >= 0.45) {
      nudge(next, "budget_in", 1.03);
      nudge(next, "timing_now_buy", 1.04);
    } else if (hitRate <= 0.2) {
      nudge(next, "budget_in", 0.97);
      nudge(next, "body_match", 0.97);
    }
  }

  // unlock/report = 강한 관심
  if (unlocks.length + reports.length >= 3) {
    nudge(next, "timing_now_buy", 1.03);
  }
  if (unwatches.length > watches.length && unwatches.length >= 5) {
    nudge(next, "tag_hot", 0.95);
  }

  const version = `learned-${new Date().toISOString().slice(0, 10)}-${BRAIN_VERSION}`;
  const stats = {
    days,
    outcomes: rows.length,
    watches: watches.length,
    matches: matches.length,
    unlocks: unlocks.length,
    reports: reports.length,
    suvWatches,
    sedanWatches,
    topHitWatched,
    topHitMissed,
    fromVersion: activeRow?.version ?? "default",
    toVersion: version,
  };

  console.log("[learn-match]", stats);

  if (opts?.dryRun) {
    return { dryRun: true as const, stats, weights: next };
  }

  // deactivate previous
  await sb.from("brain_weights").update({ active: false }).eq("scope", "match").eq("active", true);

  const { error: upErr } = await sb.from("brain_weights").upsert(
    {
      scope: "match",
      version,
      weights: next,
      active: true,
      notes: `auto-learn from ${days}d outcomes`,
    },
    { onConflict: "scope,version" },
  );
  if (upErr) throw upErr;

  return { dryRun: false as const, stats, weights: next };
}
