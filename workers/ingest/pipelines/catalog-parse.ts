/**
 * OEM 가격표 PDF → trims.base_price (+ vehicles slug 보강).
 * 1) PDF 텍스트 추출 2) 브랜드별 파서 3) preview JSON 4) SERVICE_ROLE 시 DB upsert
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  const safe = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 80);
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

async function ensureBrand(
  sb: SupabaseClient,
  name: string,
): Promise<string> {
  const { data: existing } = await sb.from("brands").select("id").eq("name", name).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await sb
    .from("brands")
    .insert({ name, name_en: name, country: "KR" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureVehicle(
  sb: SupabaseClient,
  brandId: string,
  table: ParsedPriceTable,
): Promise<string> {
  const slug = table.vehicleSlug;
  const { data: bySlug } = await sb.from("vehicles").select("id").eq("slug", slug).maybeSingle();
  if (bySlug?.id) {
    if (table.fuelHint) {
      await sb.from("vehicles").update({ fuel_type: table.fuelHint }).eq("id", bySlug.id);
    }
    return bySlug.id as string;
  }

  // model_name 느슨 매칭
  const { data: byName } = await sb
    .from("vehicles")
    .select("id, slug")
    .eq("brand_id", brandId)
    .ilike("model_name", `%${table.modelHint.replace(/더 뉴 |디 올 뉴 |2026 |2027 /g, "").slice(0, 20)}%`)
    .limit(1)
    .maybeSingle();
  if (byName?.id) {
    if (!byName.slug) await sb.from("vehicles").update({ slug }).eq("id", byName.id);
    return byName.id as string;
  }

  const modelName = table.modelHint
    .replace(/더 뉴 |디 올 뉴 |The New |The All New /gi, "")
    .trim()
    .slice(0, 80);
  const { data, error } = await sb
    .from("vehicles")
    .insert({
      brand_id: brandId,
      model_name: modelName || slug,
      slug,
      fuel_type: table.fuelHint ?? null,
      body_type: null,
      notes: `oem-catalog-parse:${table.parser}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

function trimSlug(vehicleSlug: string, trim: { name: string; nameEn?: string; basePrice: number }) {
  const base = slugify(trim.nameEn || trim.name) || "trim";
  // 동일 트림명·다른 가격 구분
  const priceKey = String(Math.round(trim.basePrice / 10_000));
  return `${vehicleSlug}-${base}-${priceKey}`.slice(0, 100);
}

async function upsertTrims(
  sb: SupabaseClient,
  vehicleId: string,
  table: ParsedPriceTable,
): Promise<{ upserted: number; updatedExisting: number }> {
  let upserted = 0;
  let updatedExisting = 0;

  const { data: existingTrims } = await sb
    .from("trims")
    .select("id, name, slug, base_price")
    .eq("vehicle_id", vehicleId);

  const existing = (existingTrims ?? []) as {
    id: string;
    name: string;
    slug: string | null;
    base_price: number | null;
  }[];

  for (const trim of table.trims) {
    const slug = trimSlug(table.vehicleSlug, trim);
    const nameNorm = trim.name.replace(/\s+/g, "").toLowerCase();
    const enNorm = (trim.nameEn ?? "").replace(/\s+/g, "").toLowerCase();

    // 1) slug exact
    let hit = existing.find((t) => t.slug === slug);
    // 2) 이름 부분 일치 (Gate0: Calligraphy / 노블레스 등)
    if (!hit) {
      hit = existing.find((t) => {
        const n = t.name.replace(/\s+/g, "").toLowerCase();
        return (
          (nameNorm && n.includes(nameNorm)) ||
          (enNorm && n.includes(enNorm)) ||
          (nameNorm && n.includes(nameNorm.slice(0, 4)))
        );
      });
    }

    if (hit) {
      await sb
        .from("trims")
        .update({
          base_price: trim.basePrice,
          slug: hit.slug ?? slug,
          notes: `oem-msrp:${table.parser}:${new Date().toISOString().slice(0, 10)}`,
        })
        .eq("id", hit.id);
      updatedExisting += 1;
      continue;
    }

    const { error } = await sb.from("trims").insert({
      vehicle_id: vehicleId,
      name: trim.nameEn ? `${trim.name} (${trim.nameEn})` : trim.name,
      base_price: trim.basePrice,
      slug,
      notes: `oem-catalog-parse:${table.parser}`,
    });
    if (error) {
      console.warn(`[catalog-parse] trim insert fail ${slug}`, error.message);
      continue;
    }
    upserted += 1;
  }

  return { upserted, updatedExisting };
}

async function markParsed(
  sb: SupabaseClient,
  url: string,
  meta: Record<string, unknown>,
) {
  await sb
    .from("source_documents")
    .update({
      parsed_at: new Date().toISOString(),
      meta,
    })
    .eq("url", url);
}

export async function parseOfficialCatalogPrices(opts?: {
  cwd?: string;
  dryRun?: boolean;
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
    results: results.map((r) =>
      opts?.dryRun
        ? r
        : {
            ...r,
            // DB 적재 시 용량 줄이기 — preview 파일엔 table 유지
            table: r.table,
          },
    ),
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

  if (opts?.dryRun) {
    return {
      ...payload.stats,
      outPath,
      dryRun: true as const,
      db: null,
      fingerprintPayload,
    };
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[catalog-parse] no SERVICE_ROLE — preview only");
    return { ...payload.stats, outPath, dryRun: false as const, db: null };
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  let vehiclesTouched = 0;
  let trimsInserted = 0;
  let trimsUpdated = 0;

  for (const r of ok) {
    if (!r.table) continue;
    try {
      const brandId = await ensureBrand(sb, r.brand);
      const vehicleId = await ensureVehicle(sb, brandId, r.table);
      vehiclesTouched += 1;
      const u = await upsertTrims(sb, vehicleId, r.table);
      trimsInserted += u.upserted;
      trimsUpdated += u.updatedExisting;
      await markParsed(sb, r.url, {
        kind: "price",
        vehicleSlug: r.vehicleSlug,
        trimCount: r.trimCount,
        parser: r.parser,
        minPrice: r.minPrice,
        maxPrice: r.maxPrice,
      });
    } catch (e) {
      console.warn(`[catalog-parse] db ${r.vehicleSlug}`, e instanceof Error ? e.message : e);
    }
  }

  const db = { vehiclesTouched, trimsInserted, trimsUpdated };
  console.log("[catalog-parse] db", db);
  return {
    ...payload.stats,
    outPath,
    dryRun: false as const,
    db,
    fingerprintPayload,
  };
}
