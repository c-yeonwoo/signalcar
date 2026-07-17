#!/usr/bin/env bun
/**
 * SignalCar ingest CLI
 *
 *   bun workers/ingest/run.ts sources
 *   bun workers/ingest/run.ts catalog-index
 *   bun workers/ingest/run.ts news-index
 *   bun workers/ingest/run.ts aggregate-signals [--dry]
 *   bun workers/ingest/run.ts sales-kot --year 2026 --month 06
 *   bun workers/ingest/run.ts keys
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FORBIDDEN_SOURCES,
  INGEST_SOURCES,
  allowedSources,
  sourcesByDomain,
  type DataDomain,
} from "./sources";

/** Load .env then .env.local into process.env (local secrets wins). */
function loadEnvFiles() {
  for (const name of [".env", ".env.local"]) {
    const path = join(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (name === ".env.local" || process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  }
}
loadEnvFiles();

const args = process.argv.slice(2);
const cmd = args[0] ?? "help";
const has = (f: string) => args.includes(f);
const get = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  switch (cmd) {
    case "keys": {
      console.log(`=== API KEYS / SECRETS REQUIRED ===

[필수 — DB 쓰기]
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
    → aggregate-signals, source_documents upsert, trims 적재

[필수 — 공공 판매통계]
  DATA_GO_KR_API_KEY          공공데이터포털 일반인증키 (.env.local)
  DATA_GO_KR_SERVICE_URL      선택. 미설정 시 기본:
    https://apis.data.go.kr/B553881/newRegistlnfoService_02/getnewRegistlnfoService02
    → https://www.data.go.kr/data/15059401/openapi.do 신청

[선택 — 앱/어드민]
  VITE_ADMIN_EMAILS           관리자 allowlist (콤마 구분)

[유료·계약 — 키 아님]
  KAIDA 등록 DB               계약/라이선스 후 ETL
  Hyundai Developers          파트너 승인 (신차 시세 1순위 아님)

=== 키 없이 동작 ===
  catalog-index   현대 GW API · 기아 DAM PDF · 제네시스 HTML 인덱스
  news-index      공식 뉴스룸 링크 인덱싱
  danawa-private  다나와 백과 로컬 스냅샷 (out/ only, 제품 DB 금지)
  danawa-sales    다나와 판매조건 → Benefit JSON (out/ · --preview 시 src/data)
  loop            일일 API loop (변경분만 갱신) · --job · --force · --dry · --sync-status
  sources         레지스트리 출력
`);
      break;
    }

    case "sources": {
      console.log("=== ALLOWED ===");
      for (const s of allowedSources()) {
        console.log(`[${s.legal}] ${s.id.padEnd(22)} ${s.domains.join(",")} ← ${s.url}`);
      }
      console.log("\n=== LICENSE REQUIRED ===");
      for (const s of INGEST_SOURCES.filter((x) => x.legal === "license_required")) {
        console.log(`${s.id.padEnd(22)} ${s.name}`);
      }
      console.log("\n=== FORBIDDEN (do not implement) ===");
      for (const s of FORBIDDEN_SOURCES) {
        console.log(`${s.id.padEnd(22)} ${s.name} — ${s.reason}`);
      }
      console.log("\n=== BY DOMAIN ===");
      for (const d of [
        "catalog",
        "options",
        "msrp",
        "promo",
        "deal_price",
        "sales",
        "news",
        "specs",
      ] as DataDomain[]) {
        const list = sourcesByDomain(d).map((s) => s.id);
        console.log(`${d}: ${list.join(", ") || "(none)"}`);
      }
      break;
    }

    case "catalog-index": {
      const { indexOfficialCatalogPdfs } = await import("./pipelines/catalog-index");
      const docs = await indexOfficialCatalogPdfs();
      const dir = join(process.cwd(), "workers/ingest/out");
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `catalog-index-${Date.now()}.json`);
      writeFileSync(path, JSON.stringify(docs, null, 2));
      const by = Object.groupBy(docs, (d) => d.sourceId);
      for (const [k, v] of Object.entries(by)) {
        console.log(`  ${k}: ${v?.length ?? 0}`);
      }
      console.log(`wrote ${docs.length} docs → ${path}`);
      break;
    }

    case "news-index": {
      const { indexOfficialNews } = await import("./pipelines/news-index");
      const docs = await indexOfficialNews();
      const dir = join(process.cwd(), "workers/ingest/out");
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `news-index-${Date.now()}.json`);
      writeFileSync(path, JSON.stringify(docs, null, 2));
      console.log(`wrote ${docs.length} docs → ${path}`);
      break;
    }

    case "aggregate-signals": {
      const { aggregatePriceSignals } = await import("./pipelines/aggregate-signals");
      const result = await aggregatePriceSignals({ dryRun: has("--dry") });
      console.log(result);
      break;
    }

    case "car-features": {
      const { buildCarFeatures } = await import("./pipelines/car-features");
      const result = await buildCarFeatures({ dryRun: has("--dry") });
      console.log({
        upserted: result.upserted,
        dryRun: result.dryRun,
        featureDate: result.featureDate,
        sample: result.rows.slice(0, 3),
      });
      break;
    }

    case "catalog-parse": {
      const { parseOfficialCatalogPrices } = await import("./pipelines/catalog-parse");
      const brandArg = get("--brand");
      const brands = brandArg
        ? ([brandArg] as Array<"hyundai" | "kia" | "genesis">)
        : undefined;
      const result = await parseOfficialCatalogPrices({
        dryRun: has("--dry"),
        limit: Number(get("--limit") ?? "60"),
        brands,
      });
      console.log(result);
      break;
    }

    case "promo-etl": {
      const { runPromoEtl } = await import("./pipelines/promo-etl");
      const result = await runPromoEtl({
        dryRun: has("--dry"),
        brand: "kia",
        month: get("--month"),
      });
      console.log(result);
      break;
    }

    case "sales-kot": {
      const { fetchKotNewRegistrations } = await import("./pipelines/sales-kot");
      const year = get("--year") ?? new Date().getFullYear().toString();
      const month = (get("--month") ?? String(new Date().getMonth()).padStart(2, "0")).padStart(
        2,
        "0",
      );
      const result = await fetchKotNewRegistrations({ year, month });
      console.log(result.skipped ?? `rows=${result.rows.length}`);
      if (result.rows.length) {
        const dir = join(process.cwd(), "workers/ingest/out");
        mkdirSync(dir, { recursive: true });
        const path = join(dir, `sales-kot-${year}${month}.json`);
        writeFileSync(path, JSON.stringify(result.rows, null, 2));
        console.log(`wrote ${path}`);
      }
      break;
    }

    case "danawa-enrich": {
      const {
        enrichDeepCatalog,
        loadLatestDeep,
        writeEnrichmentFile,
      } = await import("./pipelines/danawa-enrich");
      const { readdirSync, readFileSync: readFs } = await import("node:fs");
      const dir = join(process.cwd(), "workers/ingest/out");
      const { path: deepPath, data: deep } = loadLatestDeep(dir);
      console.log(`enrich from ${deepPath}`);
      let existing: import("./pipelines/danawa-enrich").SpecEnrichment[] = [];
      try {
        const files = readdirSync(dir)
          .filter((f) => f.startsWith("danawa-private-catalog-enrich-") && f.endsWith(".json"))
          .sort();
        if (files.length) {
          const prev = JSON.parse(readFs(join(dir, files.at(-1)!), "utf8")) as {
            enrichments?: import("./pipelines/danawa-enrich").SpecEnrichment[];
          };
          existing = prev.enrichments ?? [];
          console.log(`resume enrichments: ${existing.length}`);
        }
        const ck = join(dir, "danawa-private-enrich-checkpoint.json");
        if (existsSync(ck)) {
          const prev = JSON.parse(readFs(ck, "utf8")) as {
            enrichments?: import("./pipelines/danawa-enrich").SpecEnrichment[];
          };
          if ((prev.enrichments?.length ?? 0) > existing.length) {
            existing = prev.enrichments ?? [];
            console.log(`resume checkpoint: ${existing.length}`);
          }
        }
      } catch {
        /* fresh */
      }
      const enriched = await enrichDeepCatalog({
        deep,
        existing,
        delayMs: 220,
        checkpointEvery: 25,
        onCheckpoint: (enrichments) => {
          writeFileSync(
            join(dir, "danawa-private-enrich-checkpoint.json"),
            JSON.stringify({ enrichments, fetchedAt: new Date().toISOString() }, null, 2),
          );
          console.log(`  checkpoint enrichments=${enrichments.length}`);
        },
        onProgress: (msg) => console.log(`  ${msg}`),
      });
      const path = writeEnrichmentFile(process.cwd(), enriched);
      console.log("enrichStats", enriched.enrichStats);
      console.log(`wrote ${path}`);
      break;
    }

    case "danawa-classify": {
      const { runClassifyToFile } = await import("./pipelines/danawa-classify");
      const result = runClassifyToFile(process.cwd());
      console.log("stats", result.stats);
      console.log(`classified ${result.count} → ${result.out}`);
      break;
    }

    case "danawa-sales": {
      const {
        fetchDanawaSalesTerms,
        writeSalesSnapshot,
        toPreviewPayload,
      } = await import("./pipelines/danawa-sales");
      const model = get("--model");
      const brand = get("--brand") ?? "303";
      const preview = has("--preview");
      if (!model) {
        console.log("Usage: danawa-sales --model 4802 [--brand 303] [--preview]");
        console.log("(local out/ only — maps 판매조건 → Benefit JSON)");
        break;
      }
      const snap = await fetchDanawaSalesTerms({ brandId: brand, modelId: model });
      const path = writeSalesSnapshot(process.cwd(), snap);
      console.log(
        `${snap.modelName} period=${snap.period ?? "?"} rows=${snap.rows.length} benefits=${snap.benefits.length}`,
      );
      for (const b of snap.benefits) {
        const amt = b.amount > 0 ? `${(b.amount / 10_000).toFixed(0)}만` : "—";
        console.log(`  [${b.category}] ${b.title} ${amt} stack=${b.stackable}`);
      }
      console.log(`wrote ${path}`);
      if (preview) {
        const previewDir = join(process.cwd(), "src/data");
        mkdirSync(previewDir, { recursive: true });
        const previewPath = join(previewDir, "danawa-benefits-grandeur.json");
        writeFileSync(previewPath, JSON.stringify(toPreviewPayload(snap), null, 2) + "\n");
        console.log(`preview → ${previewPath}`);
      }
      break;
    }

    case "loop": {
      const { runIngestLoop, syncLoopStatusToApp } = await import("./pipelines/loop");
      if (has("--sync-status")) {
        const saved = syncLoopStatusToApp(process.cwd());
        console.log(`synced → ${saved.previewPath}`);
        break;
      }
      const only = get("--job") ? [get("--job")!] : undefined;
      const result = await runIngestLoop({
        cwd: process.cwd(),
        only,
        force: has("--force"),
        dryRun: has("--dry"),
        claimRequests: !has("--no-claim"),
      });
      console.log(`schedule: ${result.schedule.cron} (${result.schedule.timezone})`);
      for (const r of result.results) {
        const mark = r.changed ? "changed" : r.status;
        console.log(`  [${r.status}] ${r.jobId} ${r.error ? `— ${r.error}` : JSON.stringify(r.stats)}`);
        void mark;
      }
      console.log(`state → ${result.saved.path}`);
      console.log(`admin preview → ${result.saved.previewPath}`);
      break;
    }

    case "danawa-private": {
      const {
        fetchDanawaBrand,
        fetchDanawaBrandDeep,
        fetchDanawaModel,
        fetchFullEncyclopediaCatalog,
        fetchFullCatalogDeep,
      } = await import("./pipelines/danawa-private");
      const { readdirSync, readFileSync: readFs } = await import("node:fs");
      const brand = get("--brand");
      const model = get("--model");
      const deep = has("--deep");
      const all = has("--all");
      const maxModels = Number(get("--max") ?? "12");
      if (!brand && !model && !all) {
        console.log("Usage: danawa-private --all");
        console.log("       danawa-private --all --deep");
        console.log("       danawa-private --brand 304 [--deep] [--max 12]");
        console.log("       danawa-private --model 3995");
        console.log("(local out/ only — not product DB)");
        break;
      }
      const dir = join(process.cwd(), "workers/ingest/out");
      mkdirSync(dir, { recursive: true });
      let payload: unknown;
      let label: string;
      if (all && deep) {
        // resume: latest catalog-all + any previous deep details
        let catalog: import("./pipelines/danawa-private").DanawaFullCatalog | undefined;
        let existing: import("./pipelines/danawa-private").DanawaModelSnapshot[] = [];
        try {
          const files = readdirSync(dir)
            .filter((f) => f.startsWith("danawa-private-catalog-all-") && f.endsWith(".json"))
            .sort();
          if (files.length) {
            catalog = JSON.parse(readFs(join(dir, files.at(-1)!), "utf8"));
            console.log(`resume catalog: ${files.at(-1)}`);
          }
          const deepFiles = readdirSync(dir)
            .filter((f) => f.startsWith("danawa-private-catalog-deep-") && f.endsWith(".json"))
            .sort();
          if (deepFiles.length) {
            const prev = JSON.parse(readFs(join(dir, deepFiles.at(-1)!), "utf8")) as {
              details?: import("./pipelines/danawa-private").DanawaModelSnapshot[];
            };
            existing = prev.details ?? [];
            console.log(`resume details: ${existing.length} from ${deepFiles.at(-1)}`);
          }
        } catch {
          /* fresh */
        }
        payload = await fetchFullCatalogDeep({
          catalog,
          existingDetails: existing,
          checkpointEvery: 25,
          onCheckpoint: ({ details: d, errors: e }) => {
            const ck = join(dir, `danawa-private-catalog-deep-checkpoint.json`);
            writeFileSync(
              ck,
              JSON.stringify(
                {
                  source: "danawa-private-deep",
                  fetchedAt: new Date().toISOString(),
                  catalog,
                  details: d,
                  errors: e,
                  stats: {
                    requested: catalog?.models.length ?? 0,
                    ok: d.length,
                    failed: e.length,
                    withPrice: d.filter((x) => x.pricesWon.length > 0).length,
                    withTrim: d.filter((x) => x.trimRefs.length > 0).length,
                  },
                },
                null,
                2,
              ),
            );
            console.log(`  checkpoint → ${ck} (${d.length} details)`);
          },
          onProgress: (msg) => {
            console.log(`  ${msg}`);
          },
          delayMs: 300,
        });
        label = "catalog-deep";
      } else if (all) {
        payload = await fetchFullEncyclopediaCatalog({
          onProgress: (msg) => console.log(`  ${msg}`),
        });
        label = "catalog-all";
      } else if (model) {
        payload = await fetchDanawaModel(model);
        label = `model-${model}`;
      } else if (deep) {
        payload = await fetchDanawaBrandDeep(brand!, { maxModels });
        label = `brand-${brand}-deep`;
      } else {
        payload = await fetchDanawaBrand(brand!);
        label = `brand-${brand}`;
      }
      const path = join(dir, `danawa-private-${label}-${Date.now()}.json`);
      writeFileSync(path, JSON.stringify(payload, null, 2));
      if (payload && typeof payload === "object" && "stats" in payload) {
        console.log("stats", (payload as { stats: unknown }).stats);
      }
      console.log(`wrote ${path}`);
      break;
    }

    default:
      console.log(`Usage:
  bun workers/ingest/run.ts keys
  bun workers/ingest/run.ts sources
  bun workers/ingest/run.ts catalog-index
  bun workers/ingest/run.ts news-index
  bun workers/ingest/run.ts aggregate-signals [--dry]
  bun workers/ingest/run.ts sales-kot --year 2026 --month 06
  bun workers/ingest/run.ts danawa-private --all
  bun workers/ingest/run.ts danawa-private --all --deep
  bun workers/ingest/run.ts danawa-enrich
  bun workers/ingest/run.ts danawa-classify
  bun workers/ingest/run.ts danawa-sales --model 4802 [--brand 303] [--preview]
  bun workers/ingest/run.ts loop [--job catalog-index] [--force] [--dry] [--sync-status]
  bun workers/ingest/run.ts danawa-private --brand 304 [--deep] [--max 12]
  bun workers/ingest/run.ts danawa-private --model 3995`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
