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

    default:
      console.log(`Usage:
  bun workers/ingest/run.ts keys
  bun workers/ingest/run.ts sources
  bun workers/ingest/run.ts catalog-index
  bun workers/ingest/run.ts news-index
  bun workers/ingest/run.ts aggregate-signals [--dry]
  bun workers/ingest/run.ts sales-kot --year 2026 --month 06`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
