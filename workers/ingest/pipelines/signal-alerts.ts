/**
 * BUY 전환 알림 큐 생성.
 * - 최신 car_features_daily 가 buy 이고, 직전 feature_date 가 wait/neutral
 * - watchlist 유저 + digest_signups 이메일로 signal_alert_queue pending 적재
 * 메일 발송은 send-alerts (Resend).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

type FeatureRow = {
  trim_id: string;
  feature_date: string;
  timing_verdict: string;
  timing_score: number;
};

type ProfileRow = { trim_id: string; slug: string };

export async function buildSignalAlerts(opts?: { dryRun?: boolean; cwd?: string }) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const cwd = opts?.cwd ?? process.cwd();

  const { data: features, error } = await sb
    .from("car_features_daily")
    .select("trim_id, feature_date, timing_verdict, timing_score")
    .order("feature_date", { ascending: false })
    .limit(2000);
  if (error) throw error;

  const byTrim = new Map<string, FeatureRow[]>();
  for (const f of (features ?? []) as FeatureRow[]) {
    const arr = byTrim.get(f.trim_id) ?? [];
    if (arr.length < 3) arr.push(f);
    byTrim.set(f.trim_id, arr);
  }

  const transitions: {
    trim_id: string;
    from: string;
    to: string;
    score: number;
    feature_date: string;
  }[] = [];

  for (const [trimId, arr] of byTrim) {
    const latest = arr[0];
    const prev = arr[1];
    if (!latest || !prev) continue;
    if (latest.timing_verdict !== "buy") continue;
    if (prev.timing_verdict === "buy") continue;
    transitions.push({
      trim_id: trimId,
      from: prev.timing_verdict,
      to: latest.timing_verdict,
      score: latest.timing_score,
      feature_date: latest.feature_date,
    });
  }

  const trimIds = transitions.map((t) => t.trim_id);
  const { data: profiles } = trimIds.length
    ? await sb.from("car_profiles").select("trim_id, slug").in("trim_id", trimIds)
    : { data: [] as ProfileRow[] };
  const slugByTrim = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.trim_id, p.slug]),
  );

  const { data: watches } = trimIds.length
    ? await sb.from("watchlist").select("user_id, trim_id").in("trim_id", trimIds)
    : { data: [] as { user_id: string; trim_id: string }[] };

  const { data: digests } = await sb.from("digest_signups").select("email, user_id");

  const queue: {
    user_id: string | null;
    email: string | null;
    trim_id: string;
    car_slug: string | null;
    kind: string;
    payload: Record<string, unknown>;
    status: string;
  }[] = [];

  for (const t of transitions) {
    const slug = slugByTrim.get(t.trim_id) ?? null;
    const watchers = ((watches ?? []) as { user_id: string; trim_id: string }[]).filter(
      (w) => w.trim_id === t.trim_id,
    );
    for (const w of watchers) {
      queue.push({
        user_id: w.user_id,
        email: null,
        trim_id: t.trim_id,
        car_slug: slug,
        kind: "buy_transition",
        payload: { from: t.from, to: t.to, score: t.score, feature_date: t.feature_date },
        status: "pending",
      });
    }
    // digest 구독자에게도 모델 전환 알림 (관심 없어도 브로드캐스트 소량)
    if (t.score >= 20) {
      for (const d of (digests ?? []) as { email: string; user_id: string | null }[]) {
        queue.push({
          user_id: d.user_id,
          email: d.email,
          trim_id: t.trim_id,
          car_slug: slug,
          kind: "buy_transition_digest",
          payload: { from: t.from, to: t.to, score: t.score, feature_date: t.feature_date },
          status: "pending",
        });
      }
    }
  }

  // dedupe user+trim+kind
  const seen = new Set<string>();
  const deduped = queue.filter((q) => {
    const k = `${q.user_id ?? q.email}|${q.trim_id}|${q.kind}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const outDir = join(cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `signal-alerts-${Date.now()}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        transitions,
        queue: deduped.slice(0, 200),
        stats: {
          transitions: transitions.length,
          queued: deduped.length,
        },
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `[signal-alerts] transitions=${transitions.length} queued=${deduped.length} → ${outPath}`,
  );

  if (opts?.dryRun) {
    return {
      dryRun: true as const,
      transitions: transitions.length,
      queued: deduped.length,
      outPath,
    };
  }

  if (!deduped.length) {
    return { dryRun: false as const, transitions: 0, queued: 0, outPath, inserted: 0 };
  }

  // 이미 pending 인 동일 알림은 스킵 (최근 3일)
  const since = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { data: existing } = await sb
    .from("signal_alert_queue")
    .select("user_id, email, trim_id, kind")
    .eq("status", "pending")
    .gte("created_at", since);

  const existSet = new Set(
    ((existing ?? []) as { user_id: string | null; email: string | null; trim_id: string; kind: string }[]).map(
      (e) => `${e.user_id ?? e.email}|${e.trim_id}|${e.kind}`,
    ),
  );
  const toInsert = deduped.filter(
    (q) => !existSet.has(`${q.user_id ?? q.email}|${q.trim_id}|${q.kind}`),
  );

  if (toInsert.length) {
    const { error: insErr } = await sb.from("signal_alert_queue").insert(toInsert);
    if (insErr) throw insErr;
  }

  return {
    dryRun: false as const,
    transitions: transitions.length,
    queued: deduped.length,
    inserted: toInsert.length,
    outPath,
  };
}
