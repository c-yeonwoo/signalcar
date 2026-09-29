/**
 * OEM 가격표 PDF → 출처가 포함된 검토용 미리보기 JSON.
 * 트림 매칭과 원문 검토 전에 DB 가격을 자동 갱신하지 않는다.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractPdfText } from "../lib/pdf-text";
import {
  parseGenericPriceText,
  parseHyundaiPriceText,
  parseKiaPriceText,
  slugify,
  type ParsedPriceTable,
} from "../lib/parse-price-pdf";
import { fetchHyundaiCatalogCars } from "./hyundai-catalog";
import { indexKiaCatalogPdfs } from "./kia-catalog";
import { indexGenesisCatalog } from "./genesis-catalog";

const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

export type CatalogParseResultItem = {
  sourceId: string;
  brand: string;
  url: string;
  fileName: string;
  vehicleSlug: string;
  modelHint: string;
  trimCount: number;
  optionCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  parser: string;
  error?: string;
  table?: ParsedPriceTable;
};

function cachePath(cwd: string, fileName: string, url: string) {
  const dir = join(cwd, "workers/ingest/out/pdf-cache");
  mkdirSync(dir, { recursive: true });
  const h = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const safe = fileName.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return join(dir, `${h}-${safe}`);
}

async function downloadPdf(
  url: string,
  fileName: string,
  cwd: string,
  fetchImpl: typeof fetch,
): Promise<Uint8Array> {
  const path = cachePath(cwd, fileName, url);
  if (existsSync(path)) {
    return new Uint8Array(readFileSync(path));
  }
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/pdf,*/*",
      Referer: url.includes("hyundai.com")
        ? "https://www.hyundai.com/kr/ko/e/vehicles/catalog-price-download"
        : url.includes("kia.com")
          ? "https://www.kia.com/kr/main.html"
          : "https://www.genesis.com/kr/ko/support/download-center.html",
    },
  });
  if (!res.ok) throw new Error(`PDF HTTP ${res.status} ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength < 1_000) throw new Error(`PDF too small ${buf.byteLength}`);
  writeFileSync(path, buf);
  return buf;
}

function summarize(table: ParsedPriceTable, meta: Omit<CatalogParseResultItem, "trimCount" | "optionCount" | "minPrice" | "maxPrice" | "parser" | "table">): CatalogParseResultItem {
  const prices = table.trims.map((t) => t.basePrice);
  return {
    ...meta,
    trimCount: table.trims.length,
    optionCount: table.options.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    parser: table.parser,
    table,
  };
}

export async function parseOfficialCatalogPrices(opts?: {
  cwd?: string;
  /** 브랜드 제한 */
  brands?: Array<"hyundai" | "kia" | "genesis">;
  /** 최대 PDF 수 (개발용) */
  limit?: number;
  fetchImpl?: typeof fetch;
  /** 택시·트럭·버스 제외 (현대) */
  passengerOnly?: boolean;
}) {
  const cwd = opts?.cwd ?? process.cwd();
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const brands = opts?.brands ?? ["hyundai", "kia", "genesis"];
  const passengerOnly = opts?.passengerOnly !== false;
  const limit = opts?.limit ?? 80;
  const results: CatalogParseResultItem[] = [];
  let processed = 0;

  if (brands.includes("hyundai")) {
    const cars = await fetchHyundaiCatalogCars(fetchImpl);
    for (const c of cars) {
      if (processed >= limit) break;
      if (!c.pTableFilePath || !c.carCode) continue;
      if (passengerOnly && c.carTypeCode && !["P", "R", "S", "E", "N"].includes(c.carTypeCode)) {
        continue;
      }
      const url = `https://www.hyundai.com${c.pTableFilePath}`;
      const fileName = c.pTableFilePath.split("/").pop() ?? `${c.carCode}.pdf`;
      try {
        const bytes = await downloadPdf(url, fileName, cwd, fetchImpl);
        const { text } = await extractPdfText(bytes);
        const table = parseHyundaiPriceText(text, {
          carName: c.carName,
          carEngName: c.carEngName,
          brand: "현대",
        });
        results.push(
          summarize(table, {
            sourceId: "hyundai-catalog",
            brand: "현대",
            url,
            fileName,
            vehicleSlug: table.vehicleSlug,
            modelHint: c.carName,
          }),
        );
        processed += 1;
      } catch (e) {
        results.push({
          sourceId: "hyundai-catalog",
          brand: "현대",
          url,
          fileName,
          vehicleSlug: slugify(c.carEngName ?? c.carName),
          modelHint: c.carName,
          trimCount: 0,
          optionCount: 0,
          minPrice: null,
          maxPrice: null,
          parser: "hyundai-v1",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  if (brands.includes("kia") && processed < limit) {
    const docs = await indexKiaCatalogPdfs({ fetchImpl });
    for (const d of docs) {
      if (processed >= limit) break;
      if (d.kind !== "price") continue;
      try {
        const bytes = await downloadPdf(d.url, d.fileName, cwd, fetchImpl);
        const { text } = await extractPdfText(bytes);
        const table = parseKiaPriceText(text, { slug: d.slug, brand: "기아" });
        results.push(
          summarize(table, {
            sourceId: "kia-catalog",
            brand: "기아",
            url: d.url,
            fileName: d.fileName,
            vehicleSlug: table.vehicleSlug,
            modelHint: d.slug,
          }),
        );
        processed += 1;
      } catch (e) {
        results.push({
          sourceId: "kia-catalog",
          brand: "기아",
          url: d.url,
          fileName: d.fileName,
          vehicleSlug: d.slug,
          modelHint: d.slug,
          trimCount: 0,
          optionCount: 0,
          minPrice: null,
          maxPrice: null,
          parser: "kia-v1",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  if (brands.includes("genesis") && processed < limit) {
    const docs = await indexGenesisCatalog({ fetchImpl });
    for (const d of docs) {
      if (processed >= limit) break;
      if (d.kind !== "price") continue;
      // POST 다운로드는 별도 — DAM publicUrl 있는 가격표만
      if (!d.publicUrl) continue;
      const url = d.publicUrl;
      const fileName = d.realFileNm || `${d.fileKey}.pdf`;
      try {
        const bytes = await downloadPdf(url, fileName, cwd, fetchImpl);
        const { text } = await extractPdfText(bytes);
        const hint = slugify(d.realFileNm.replace(/\.pdf$/i, ""));
        const table = parseGenericPriceText(text, {
          modelHint: d.realFileNm,
          vehicleSlug: hint.replace(/-?pricelist.*$/i, "").replace(/-?price.*$/i, "") || hint,
          brand: "제네시스",
        });
        results.push(
          summarize(table, {
            sourceId: "genesis-catalog",
            brand: "제네시스",
            url,
            fileName,
            vehicleSlug: table.vehicleSlug,
            modelHint: table.modelHint,
          }),
        );
        processed += 1;
      } catch (e) {
        results.push({
          sourceId: "genesis-catalog",
          brand: "제네시스",
          url,
          fileName,
          vehicleSlug: slugify(d.realFileNm),
          modelHint: d.realFileNm,
          trimCount: 0,
          optionCount: 0,
          minPrice: null,
          maxPrice: null,
          parser: "generic-v1",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  const ok = results.filter((r) => r.trimCount > 0);
  const payload = {
    source: "catalog-parse",
    fetchedAt: new Date().toISOString(),
    stats: {
      docs: results.length,
      parsed: ok.length,
      errors: results.filter((r) => r.error).length,
      trims: ok.reduce((n, r) => n + r.trimCount, 0),
    },
    results,
  };

  const outDir = join(cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `catalog-parse-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(
    `[catalog-parse] docs=${payload.stats.docs} parsed=${payload.stats.parsed} trims=${payload.stats.trims} → ${outPath}`,
  );

  const fingerprintPayload = ok
    .map((r) => ({
      u: r.url,
      n: r.trimCount,
      min: r.minPrice,
      max: r.maxPrice,
    }))
    .sort((a, b) => a.u.localeCompare(b.u));

  return {
    ...payload.stats,
    outPath,
    dryRun: true as const,
    db: null,
    fingerprintPayload,
  };
}
