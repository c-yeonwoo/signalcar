/**
 * 일일 Ingest API Loop.
 *
 * - 등록된 작업만 실행
 * - fingerprint 동일 → skipped_unchanged (갱신 불필요)
 * - 상태: workers/ingest/out/loop-state.json + src/data/ingest-loop-status.json
 * - service_role 있으면 ingest_runs / config / requests 동기화
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  LOOP_JOBS,
  LOOP_SCHEDULE,
  emptyLoopStatus,
  type LoopJobDef,
  type LoopJobStatus,
  type LoopStatusFile,
  type LoopJobRuntime,
} from "../../../src/lib/ingest-loop";

function fingerprint(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

function loadState(cwd: string): LoopStatusFile {
  const path = join(cwd, "workers/ingest/out/loop-state.json");
  if (!existsSync(path)) return emptyLoopStatus();
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LoopStatusFile;
  } catch {
    return emptyLoopStatus();
  }
}

function saveState(cwd: string, state: LoopStatusFile) {
  const dir = join(cwd, "workers/ingest/out");
  mkdirSync(dir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  const path = join(dir, "loop-state.json");
  writeFileSync(path, JSON.stringify(state, null, 2) + "\n");

  const previewDir = join(cwd, "src/data");
  mkdirSync(previewDir, { recursive: true });
  const previewPath = join(previewDir, "ingest-loop-status.json");
  writeFileSync(previewPath, JSON.stringify(state, null, 2) + "\n");
  return { path, previewPath };
}

type AnySb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function sbClient(): Promise<AnySb | null> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key, { auth: { persistSession: false } }) as AnySb;
  } catch {
    return null;
  }
}

async function loadEnabledOverrides(
  sb: AnySb | null,
  state: LoopStatusFile,
): Promise<Map<string, boolean>> {
  const map = new Map(state.jobs.map((j) => [j.jobId, j.enabled]));
  if (!sb) return map;
  const { data, error } = await sb.from("ingest_loop_config").select("job_id, enabled");
  if (error || !data) return map;
  for (const row of data as { job_id: string; enabled: boolean }[]) {
    map.set(row.job_id, row.enabled);
  }
  return map;
}

async function logRun(
  sb: AnySb | null,
  pipeline: string,
  status: string,
  startedAt: string,
  stats: Record<string, unknown>,
  error?: string,
) {
  if (!sb) return;
  await sb.from("ingest_runs").insert({
    pipeline,
    status,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    stats,
    error: error ?? null,
  });
}

type JobResult = {
  jobId: string;
  status: LoopJobStatus;
  fingerprint?: string;
  stats: Record<string, unknown>;
  error?: string;
  changed: boolean;
};

async function runCatalogIndex(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { indexOfficialCatalogPdfs } = await import("./catalog-index");
  const docs = await indexOfficialCatalogPdfs();
  const fp = fingerprint(
    docs.map((d) => ({ url: d.url, sourceId: d.sourceId, fileName: d.fileName })).sort((a, b) =>
      a.url.localeCompare(b.url),
    ),
  );
  const dir = join(cwd, "workers/ingest/out");
  mkdirSync(dir, { recursive: true });
  if (fp === prevFp) {
    return {
      jobId: "catalog-index",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { docs: docs.length, unchanged: true },
      changed: false,
    };
  }
  const path = join(dir, `catalog-index-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(docs, null, 2));

  const sb = await sbClient();
  if (sb) {
    for (const d of docs) {
      await sb.from("source_documents").upsert(
        {
          source_id: d.sourceId,
          brand_hint: d.brandHint ?? null,
          url: d.url,
          file_name: d.fileName ?? null,
          content_type: "application/pdf",
          meta: { ...(d.meta ?? {}), kind: d.kind ?? null },
          fetched_at: d.fetchedAt ?? new Date().toISOString(),
        },
        { onConflict: "url" },
      );
    }
  }

  return {
    jobId: "catalog-index",
    status: "ok",
    fingerprint: fp,
    stats: { docs: docs.length, path, db: Boolean(sb) },
    changed: true,
  };
}

async function runNewsIndex(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { indexOfficialNews } = await import("./news-index");
  const items = await indexOfficialNews();
  const fp = fingerprint(
    items
      .map((n) => ({ title: n.title, url: n.url, sourceId: n.sourceId }))
      .sort((a, b) => (a.url ?? "").localeCompare(b.url ?? "")),
  );
  const dir = join(cwd, "workers/ingest/out");
  mkdirSync(dir, { recursive: true });
  if (fp === prevFp) {
    return {
      jobId: "news-index",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { items: items.length, unchanged: true },
      changed: false,
    };
  }
  const path = join(dir, `news-index-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(items, null, 2));

  const sb = await sbClient();
  if (sb) {
    for (const n of items) {
      if (!n.url) continue;
      const { data: existing } = await sb
        .from("news_items")
        .select("id")
        .eq("url", n.url)
        .maybeSingle();
      if (existing) continue;
      await sb.from("news_items").insert({
        source_id: n.sourceId,
        kind: "launch",
        tag: n.brandHint ?? null,
        title: n.title,
        url: n.url,
      });
    }
  }

  return {
    jobId: "news-index",
    status: "ok",
    fingerprint: fp,
    stats: { items: items.length, path, db: Boolean(sb) },
    changed: true,
  };
}

async function runAggregateSignals(prevFp: string | null): Promise<JobResult> {
  const { aggregatePriceSignals } = await import("./aggregate-signals");
  const result = await aggregatePriceSignals({ dryRun: true });
  const fp = fingerprint(
    (result.rows ?? [])
      .map((r) => ({
        trim_id: r.trim_id,
        month: r.month,
        median: r.median_deal_price,
        n: r.sample_size,
      }))
      .sort((a, b) => `${a.trim_id}|${a.month}`.localeCompare(`${b.trim_id}|${b.month}`)),
  );
  if (fp === prevFp) {
    return {
      jobId: "aggregate-signals",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { buckets: result.rows.length, unchanged: true },
      changed: false,
    };
  }
  const written = await aggregatePriceSignals({ dryRun: false });
  return {
    jobId: "aggregate-signals",
    status: "ok",
    fingerprint: fp,
    stats: { upserted: written.upserted, buckets: result.rows.length },
    changed: true,
  };
}

async function runSalesKot(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { fetchKotNewRegistrations } = await import("./sales-kot");
  const now = new Date();
  // 전월 확정분 우선
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  const year = String(d.getUTCFullYear());
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const result = await fetchKotNewRegistrations({ year, month });
  const fp = fingerprint({
    year,
    month,
    count: result.rows[0]?.count ?? null,
    skipped: result.skipped ?? null,
  });
  if (fp === prevFp) {
    return {
      jobId: "sales-kot",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { year, month, unchanged: true },
      changed: false,
    };
  }
  const dir = join(cwd, "workers/ingest/out");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `sales-kot-${year}${month}.json`);
  writeFileSync(path, JSON.stringify(result.rows, null, 2));
  return {
    jobId: "sales-kot",
    status: result.skipped ? "ok" : "ok",
    fingerprint: fp,
    stats: {
      year,
      month,
      rows: result.rows.length,
      count: result.rows[0]?.count ?? null,
      skipped: result.skipped ?? null,
      path,
    },
    changed: true,
  };
}

async function runDanawaSalesPreview(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { fetchDanawaSalesTerms, toPreviewPayload, writeSalesSnapshot } = await import(
    "./danawa-sales"
  );
  const snap = await fetchDanawaSalesTerms({ brandId: "303", modelId: "4802" });
  const fp = fingerprint({
    period: snap.period,
    benefits: snap.benefits.map((b) => ({
      id: b.id,
      cat: b.category,
      title: b.title,
      amount: b.amount,
      note: b.note,
    })),
  });
  if (fp === prevFp) {
    return {
      jobId: "danawa-sales-preview",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { modelId: "4802", unchanged: true },
      changed: false,
    };
  }
  const outPath = writeSalesSnapshot(cwd, snap);
  const previewDir = join(cwd, "src/data");
  mkdirSync(previewDir, { recursive: true });
  const previewPath = join(previewDir, "danawa-benefits-grandeur.json");
  writeFileSync(previewPath, JSON.stringify(toPreviewPayload(snap), null, 2) + "\n");
  return {
    jobId: "danawa-sales-preview",
    status: "ok",
    fingerprint: fp,
    stats: {
      modelId: "4802",
      benefits: snap.benefits.length,
      period: snap.period,
      outPath,
      previewPath,
    },
    changed: true,
  };
}

async function runLearnMatch(_prevFp: string | null): Promise<JobResult> {
  const { learnMatchWeights } = await import("./learn-match");
  const written = await learnMatchWeights({ dryRun: false });
  return {
    jobId: "learn-match",
    status: "ok",
    fingerprint: fingerprint(written.stats),
    stats: written.stats as Record<string, unknown>,
    changed: true,
  };
}

async function runTimingEval(_prevFp: string | null): Promise<JobResult> {
  const { evaluateTimingPredictions } = await import("./timing-eval");
  const written = await evaluateTimingPredictions({ dryRun: false });
  return {
    jobId: "timing-eval",
    status: "ok",
    fingerprint: fingerprint(written.summary),
    stats: { ...written.summary, upserted: "upserted" in written ? written.upserted : 0 },
    changed: true,
  };
}

async function runSignalAlerts(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { buildSignalAlerts } = await import("./signal-alerts");
  const dry = await buildSignalAlerts({ cwd, dryRun: true });
  const fp = fingerprint({ t: dry.transitions, q: dry.queued });
  if (fp === prevFp) {
    return {
      jobId: "signal-alerts",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { transitions: dry.transitions, queued: dry.queued, unchanged: true },
      changed: false,
    };
  }
  const written = await buildSignalAlerts({ cwd, dryRun: false });
  return {
    jobId: "signal-alerts",
    status: "ok",
    fingerprint: fp,
    stats: {
      transitions: written.transitions,
      queued: written.queued,
      inserted: "inserted" in written ? written.inserted : 0,
    },
    changed: true,
  };
}

async function runPromoEtlJob(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { runPromoEtl } = await import("./promo-etl");
  const dry = await runPromoEtl({ cwd, dryRun: true, brand: "all" });
  const fp = fingerprint({
    month: dry.month,
    offers: dry.fingerprintOffers,
    withAmount: dry.withAmount,
  });
  if (fp === prevFp) {
    return {
      jobId: "promo-etl",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { month: dry.month, offers: dry.offers, unchanged: true },
      changed: false,
    };
  }
  const written = await runPromoEtl({ cwd, dryRun: false, brand: "all" });
  return {
    jobId: "promo-etl",
    status: "ok",
    fingerprint: fp,
    stats: {
      month: written.month,
      offers: written.offers,
      withAmount: written.withAmount,
      db: written.db,
      brands: written.brands,
    },
    changed: true,
  };
}

async function runCatalogParse(cwd: string, prevFp: string | null): Promise<JobResult> {
  const { parseOfficialCatalogPrices } = await import("./catalog-parse");
  const dry = await parseOfficialCatalogPrices({
    cwd,
    dryRun: true,
    limit: 60,
    brands: ["hyundai", "kia", "genesis"],
  });
  const fp = fingerprint(dry.fingerprintPayload ?? { parsed: dry.parsed, trims: dry.trims });
  if (fp === prevFp) {
    return {
      jobId: "catalog-parse",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: {
        docs: dry.docs,
        parsed: dry.parsed,
        trims: dry.trims,
        unchanged: true,
      },
      changed: false,
    };
  }
  const written = await parseOfficialCatalogPrices({
    cwd,
    dryRun: false,
    limit: 60,
    brands: ["hyundai", "kia", "genesis"],
  });
  return {
    jobId: "catalog-parse",
    status: "ok",
    fingerprint: fp,
    stats: {
      docs: written.docs,
      parsed: written.parsed,
      trims: written.trims,
      db: written.db,
    },
    changed: true,
  };
}

async function runCarFeatures(prevFp: string | null): Promise<JobResult> {
  const { buildCarFeatures } = await import("./car-features");
  const dry = await buildCarFeatures({ dryRun: true, syncSignals: false });
  const fp = fingerprint(
    dry.rows
      .map((r) => {
        const row = r as {
          trim_id: string;
          timing_verdict: string;
          timing_score: number;
          sample_size: number;
          median_deal_price: number | null;
        };
        return {
          trim_id: row.trim_id,
          v: row.timing_verdict,
          s: row.timing_score,
          n: row.sample_size,
          m: row.median_deal_price,
        };
      })
      .sort((a, b) => a.trim_id.localeCompare(b.trim_id)),
  );
  if (fp === prevFp) {
    return {
      jobId: "car-features",
      status: "skipped_unchanged",
      fingerprint: fp,
      stats: { rows: dry.rows.length, unchanged: true },
      changed: false,
    };
  }
  const written = await buildCarFeatures({ dryRun: false });
  return {
    jobId: "car-features",
    status: "ok",
    fingerprint: fp,
    stats: {
      upserted: written.upserted,
      featureDate: written.featureDate,
      brainVersion: "v1.2.0",
    },
    changed: true,
  };
}

async function executeJob(
  job: LoopJobDef,
  cwd: string,
  prevFp: string | null,
): Promise<JobResult> {
  switch (job.id) {
    case "catalog-index":
      return runCatalogIndex(cwd, prevFp);
    case "news-index":
      return runNewsIndex(cwd, prevFp);
    case "aggregate-signals":
      return runAggregateSignals(prevFp);
    case "sales-kot":
      return runSalesKot(cwd, prevFp);
    case "danawa-sales-preview":
      return runDanawaSalesPreview(cwd, prevFp);
    case "car-features":
      return runCarFeatures(prevFp);
    case "catalog-parse":
      return runCatalogParse(cwd, prevFp);
    case "promo-etl":
      return runPromoEtlJob(cwd, prevFp);
    case "learn-match":
      return runLearnMatch(prevFp);
    case "timing-eval":
      return runTimingEval(prevFp);
    case "signal-alerts":
      return runSignalAlerts(cwd, prevFp);
    default:
      return {
        jobId: job.id,
        status: "error",
        stats: {},
        error: `unknown job ${job.id}`,
        changed: false,
      };
  }
}

function ensureJobRuntime(state: LoopStatusFile, jobId: string): LoopJobRuntime {
  let row = state.jobs.find((j) => j.jobId === jobId);
  if (!row) {
    const def = LOOP_JOBS.find((j) => j.id === jobId);
    row = {
      jobId,
      enabled: def?.defaultEnabled ?? true,
      lastStatus: "never",
      lastRunAt: null,
      lastChangedAt: null,
      lastFingerprint: null,
      lastError: null,
      lastStats: {},
    };
    state.jobs.push(row);
  }
  return row;
}

export type LoopRunOptions = {
  cwd?: string;
  /** 특정 job만 */
  only?: string[];
  /** 비활성·미도래 무시하고 강제 */
  force?: boolean;
  dryRun?: boolean;
  /** pending 수동 요청 처리 */
  claimRequests?: boolean;
};

export async function runIngestLoop(opts: LoopRunOptions = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const state = loadState(cwd);
  state.schedule = { ...LOOP_SCHEDULE };
  const sb = await sbClient();
  const enabledMap = await loadEnabledOverrides(sb, state);

  // sync job list shape
  for (const def of LOOP_JOBS) {
    const row = ensureJobRuntime(state, def.id);
    row.enabled = enabledMap.get(def.id) ?? def.defaultEnabled;
  }

  let jobIds = opts.only?.length
    ? opts.only
    : LOOP_JOBS.filter((j) => j.cadence === "daily").map((j) => j.id);

  if (opts.claimRequests && sb) {
    const { data: reqs } = await sb
      .from("ingest_run_requests")
      .select("id, job_id")
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
      .limit(20);
    if (reqs?.length) {
      const requested = new Set<string>();
      for (const r of reqs as { id: string; job_id: string }[]) {
        await sb
          .from("ingest_run_requests")
          .update({ status: "claimed", claimed_at: new Date().toISOString() })
          .eq("id", r.id);
        if (r.job_id === "all") {
          LOOP_JOBS.filter((j) => j.cadence === "daily").forEach((j) => requested.add(j.id));
        } else {
          requested.add(r.job_id);
        }
      }
      jobIds = [...new Set([...jobIds, ...requested])];
    }
  }

  const results: JobResult[] = [];

  for (const jobId of jobIds) {
    const def = LOOP_JOBS.find((j) => j.id === jobId);
    if (!def) {
      results.push({
        jobId,
        status: "error",
        stats: {},
        error: "unknown job",
        changed: false,
      });
      continue;
    }
    const runtime = ensureJobRuntime(state, jobId);
    const enabled = enabledMap.get(jobId) ?? def.defaultEnabled;
    runtime.enabled = enabled;

    if (!enabled && !opts.force) {
      const r: JobResult = {
        jobId,
        status: "skipped_disabled",
        stats: {},
        changed: false,
      };
      results.push(r);
      continue;
    }

    if (opts.dryRun) {
      results.push({
        jobId,
        status: "pending",
        stats: { dryRun: true, needsEnv: def.requiresEnv ?? [] },
        changed: false,
      });
      continue;
    }

    if (def.requiresEnv?.length) {
      const missing = def.requiresEnv.filter((k) => !process.env[k]);
      if (missing.length) {
        const r: JobResult = {
          jobId,
          status: "error",
          stats: {},
          error: `missing env: ${missing.join(", ")}`,
          changed: false,
        };
        results.push(r);
        runtime.lastStatus = "error";
        runtime.lastError = r.error!;
        runtime.lastRunAt = new Date().toISOString();
        await logRun(sb, def.pipeline, "error", runtime.lastRunAt, {}, r.error);
        continue;
      }
    }

    const startedAt = new Date().toISOString();
    try {
      const result = await executeJob(def, cwd, runtime.lastFingerprint);
      results.push(result);
      runtime.lastStatus = result.status;
      runtime.lastRunAt = startedAt;
      runtime.lastStats = result.stats;
      runtime.lastError = result.error ?? null;
      if (result.fingerprint) runtime.lastFingerprint = result.fingerprint;
      if (result.changed) runtime.lastChangedAt = startedAt;

      state.recentRuns.unshift({
        id: `${jobId}-${Date.now()}`,
        jobId,
        status: result.status,
        startedAt,
        finishedAt: new Date().toISOString(),
        stats: result.stats,
        error: result.error ?? null,
      });
      state.recentRuns = state.recentRuns.slice(0, 40);

      await logRun(sb, def.pipeline, result.status, startedAt, result.stats, result.error);

      if (sb && opts.claimRequests) {
        await sb
          .from("ingest_run_requests")
          .update({
            status: result.status === "error" ? "failed" : "done",
            finished_at: new Date().toISOString(),
            result: result as unknown as Record<string, unknown>,
          })
          .eq("job_id", jobId)
          .eq("status", "claimed");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const result: JobResult = {
        jobId,
        status: "error",
        stats: {},
        error: msg,
        changed: false,
      };
      results.push(result);
      runtime.lastStatus = "error";
      runtime.lastError = msg;
      runtime.lastRunAt = startedAt;
      state.recentRuns.unshift({
        id: `${jobId}-${Date.now()}`,
        jobId,
        status: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        stats: {},
        error: msg,
      });
      state.recentRuns = state.recentRuns.slice(0, 40);
      await logRun(sb, def.pipeline, "error", startedAt, {}, msg);
    }
  }

  const saved = saveState(cwd, state);
  return { results, state, saved, schedule: LOOP_SCHEDULE };
}

/** 상태 파일만 앱 프리뷰로 복사 */
export function syncLoopStatusToApp(cwd = process.cwd()) {
  const state = loadState(cwd);
  return saveState(cwd, state);
}

/** 미사용 import 방지용 — copyFileSync는 상태 백업에 쓸 수 있음 */
export function backupLoopState(cwd = process.cwd()) {
  const src = join(cwd, "workers/ingest/out/loop-state.json");
  if (!existsSync(src)) return null;
  const dest = join(cwd, "workers/ingest/out", `loop-state-backup-${Date.now()}.json`);
  copyFileSync(src, dest);
  return dest;
}
