/**
 * 공식 카탈로그/가격표 페이지에서 PDF 링크 인덱싱.
 * PDF 파싱(트림·옵션 OCR)은 후속 — 우선 URL·파일명·브랜드 메타만 수집.
 */
import { INGEST_SOURCES } from "../sources";

export type CatalogDoc = {
  sourceId: string;
  brandHint: string;
  url: string;
  fileName: string;
  fetchedAt: string;
};

const PDF_RE = /https?:\/\/[^"'\\\s>]+\.pdf/gi;
const REL_PDF_RE = /(?:href|src)=["']([^"']+\.pdf)["']/gi;
/** Genesis download-info JSON blobs */
const GENESIS_META_RE = /data-download-info="(\{[^"]+\})"/gi;
/** Hyundai CDN style paths in HTML/JS */
const HYUNDAI_PATH_RE = /\/contents\/[^"'\\\s>]+\.pdf/gi;

function brandFromSource(id: string): string {
  if (id.startsWith("hyundai")) return "현대";
  if (id.startsWith("kia")) return "기아";
  if (id.startsWith("genesis")) return "제네시스";
  if (id.startsWith("renault")) return "르노코리아";
  if (id.startsWith("kgm")) return "KG모빌리티";
  return "unknown";
}

function absUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function unescapeHtml(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&");
}

export async function indexOfficialCatalogPdfs(opts?: {
  sourceIds?: string[];
  fetchImpl?: typeof fetch;
}): Promise<CatalogDoc[]> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const sources = INGEST_SOURCES.filter(
    (s) =>
      s.method === "pdf_index" &&
      s.legal === "allowed" &&
      s.kind === "official_catalog" &&
      (!opts?.sourceIds || opts.sourceIds.includes(s.id)),
  );

  const out: CatalogDoc[] = [];
  const seen = new Set<string>();
  const fetchedAt = new Date().toISOString();

  for (const src of sources) {
    console.log(`[catalog-index] GET ${src.url}`);
    const res = await fetchFn(src.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[catalog-index] ${src.id} HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();

    const urls = new Set<string>();
    for (const m of html.matchAll(PDF_RE)) urls.add(m[0]!);
    for (const m of html.matchAll(REL_PDF_RE)) urls.add(absUrl(src.url, m[1]!));
    for (const m of html.matchAll(HYUNDAI_PATH_RE)) {
      urls.add(absUrl("https://www.hyundai.com", m[0]!));
    }

    for (const m of html.matchAll(GENESIS_META_RE)) {
      try {
        const meta = JSON.parse(unescapeHtml(m[1]!)) as { realFileNm?: string };
        if (meta.realFileNm?.toLowerCase().endsWith(".pdf")) {
          urls.add(
            `https://www.genesis.com/content/dam/genesis-p2/kr/assets/download/${meta.realFileNm}`,
          );
        }
      } catch {
        /* ignore */
      }
    }

    for (const url of urls) {
      if (seen.has(url) || !url.toLowerCase().includes(".pdf")) continue;
      if (!url.startsWith("http")) continue;
      seen.add(url);
      const fileName = decodeURIComponent(url.split("/").pop() ?? url);
      out.push({
        sourceId: src.id,
        brandHint: brandFromSource(src.id),
        url,
        fileName,
        fetchedAt,
      });
    }
    console.log(`[catalog-index] ${src.id}: ${urls.size} candidates`);
  }

  return out;
}
