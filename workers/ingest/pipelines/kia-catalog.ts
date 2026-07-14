/**
 * 기아 카탈로그·가격표 인덱스.
 *
 * kwpapi.kia.com 은 시스템 토큰 필요(401) → CLI에서 호출하지 않음.
 * 공개 DAM PDF는 키 없이 접근 가능:
 *   https://www.kia.com/content/dam/kwp/kr/ko/vehicles/pdf/{catalog|price}/{catalog|price}_{slug}.pdf
 *
 * 시드: workers/ingest/fixtures/kia-pdf-seed.json (페이지 탭 순회 스냅샷)
 * HTML에서 추가 PDF 링크를 병합.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type KiaCatalogDoc = {
  sourceId: "kia-catalog";
  brandHint: "기아";
  kind: "price" | "catalog" | "catalog_mobile";
  slug: string;
  url: string;
  fileName: string;
  fetchedAt: string;
};

const PAGE = "https://www.kia.com/kr/vehicles/catalog-price";
const PDF_RE =
  /https?:\/\/www\.kia\.com\/content\/dam\/kwp\/kr\/ko\/vehicles\/pdf\/[^"'\\\s>]+\.pdf/gi;
const REL_PDF_RE =
  /\/content\/dam\/kwp\/kr\/ko\/vehicles\/pdf\/[^"'\\\s>]+\.pdf/gi;

const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

function classify(url: string): Omit<KiaCatalogDoc, "fetchedAt"> {
  const fileName = decodeURIComponent(url.split("/").pop() ?? url);
  let kind: KiaCatalogDoc["kind"] = "catalog";
  let slug = fileName.replace(/\.pdf$/i, "");
  if (fileName.startsWith("price_")) {
    kind = "price";
    slug = fileName.slice("price_".length).replace(/\.pdf$/i, "");
  } else if (fileName.startsWith("catalog_mo_")) {
    kind = "catalog_mobile";
    slug = fileName.slice("catalog_mo_".length).replace(/\.pdf$/i, "");
  } else if (fileName.startsWith("catalog_")) {
    kind = "catalog";
    slug = fileName.slice("catalog_".length).replace(/\.pdf$/i, "");
  }
  return {
    sourceId: "kia-catalog",
    brandHint: "기아",
    kind,
    slug,
    url,
    fileName,
  };
}

function loadSeed(cwd = process.cwd()): KiaCatalogDoc[] {
  const path = join(cwd, "workers/ingest/fixtures/kia-pdf-seed.json");
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    fetchedAt?: string;
    docs?: Array<Omit<KiaCatalogDoc, "fetchedAt"> & { fetchedAt?: string }>;
  };
  const fetchedAt = raw.fetchedAt ?? new Date().toISOString();
  return (raw.docs ?? []).map((d) => ({
    sourceId: "kia-catalog",
    brandHint: "기아",
    kind: d.kind,
    slug: d.slug,
    url: d.url,
    fileName: d.fileName,
    fetchedAt: d.fetchedAt ?? fetchedAt,
  }));
}

export async function indexKiaCatalogPdfs(opts?: {
  fetchImpl?: typeof fetch;
  cwd?: string;
}): Promise<KiaCatalogDoc[]> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const fetchedAt = new Date().toISOString();
  const byUrl = new Map<string, KiaCatalogDoc>();

  for (const d of loadSeed(opts?.cwd)) {
    byUrl.set(d.url, { ...d, fetchedAt });
  }

  try {
    const res = await fetchFn(PAGE, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const urls = new Set<string>();
      for (const m of html.matchAll(PDF_RE)) urls.add(m[0]!);
      for (const m of html.matchAll(REL_PDF_RE)) {
        urls.add(`https://www.kia.com${m[0]}`);
      }
      for (const url of urls) {
        byUrl.set(url, { ...classify(url), fetchedAt });
      }
    } else {
      console.warn(`[kia-catalog] page HTTP ${res.status} — using seed only`);
    }
  } catch (e) {
    console.warn(`[kia-catalog] page fetch failed — using seed only`, e);
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}
