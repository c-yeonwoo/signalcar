#!/usr/bin/env bun
/**
 * SignalCar ingest CLI
 *
 *   bun workers/ingest/run.ts sources
 *   bun workers/ingest/run.ts catalog-index
 *   bun workers/ingest/run.ts aggregate-signals [--dry]
 *   bun workers/ingest/run.ts sales-kot --year 2026 --month 06
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  FORBIDDEN_SOURCES,
  INGEST_SOURCES,
  allowedSources,
  sourcesByDomain,
  type DataDomain,
} from "./sources";

const args = process.argv.slice(2);
const cmd = args[0] ?? "help";
const has = (f: string) => args.includes(f);
const get = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  switch (cmd) {
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
  bun workers/ingest/run.ts sources
  bun workers/ingest/run.ts catalog-index
  bun workers/ingest/run.ts aggregate-signals [--dry]
  bun workers/ingest/run.ts sales-kot --year 2026 --month 06`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
