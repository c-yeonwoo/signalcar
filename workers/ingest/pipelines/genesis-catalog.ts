/**
 * 제네시스 다운로드 센터 인덱스.
 * HTML의 viewPdf(fileKey, realFileNm, fileType) 파싱.
 * 실제 PDF는 POST /wsvc/kr/api/v2/downloadcenter/pdfdownload (file_key) — 바이너리 다운로드는 별도.
 * 액세서리 등 일부는 DAM 직링크 가능.
 */
export type GenesisCatalogDoc = {
  sourceId: "genesis-catalog";
  brandHint: "제네시스";
  fileKey: string;
  realFileNm: string;
  fileType: string;
  kind: "price" | "catalog" | "other";
  downloadUrl: string;
  method: "POST";
  /** DAM 직링크가 있는 경우만 */
  publicUrl?: string;
  fetchedAt: string;
};

const PAGE =
  "https://www.genesis.com/kr/ko/support/download-center/genesis-models.html";
const DOWNLOAD =
  "https://www.genesis.com/wsvc/kr/api/v2/downloadcenter/pdfdownload";
const DAM_BASE =
  "https://www.genesis.com/content/dam/genesis-p2/kr/assets/support/download-center/genesis-models";

const VIEW_PDF_RE =
  /viewPdf\('([^']+)','([^']+)','([^']+)'\)/g;
const DAM_PDF_RE =
  /\/content\/dam\/genesis-p2\/kr\/assets\/support\/download-center\/genesis-models\/[^"'\\\s>]+\.pdf/gi;

const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

function kindOf(name: string, fileType: string): GenesisCatalogDoc["kind"] {
  if (/pricelist/i.test(name) || fileType === "BROCHURE") return "price";
  if (/catalog/i.test(name) || /CATALOG/i.test(fileType)) return "catalog";
  return "other";
}

export async function indexGenesisCatalog(opts?: {
  fetchImpl?: typeof fetch;
}): Promise<GenesisCatalogDoc[]> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const res = await fetchFn(PAGE, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`genesis download-center HTTP ${res.status}`);
  const html = await res.text();
  const fetchedAt = new Date().toISOString();
  const out: GenesisCatalogDoc[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(VIEW_PDF_RE)) {
    const [, fileKey, realFileNm, fileType] = m;
    if (!fileKey || seen.has(fileKey)) continue;
    seen.add(fileKey);
    out.push({
      sourceId: "genesis-catalog",
      brandHint: "제네시스",
      fileKey,
      realFileNm: realFileNm!,
      fileType: fileType!,
      kind: kindOf(realFileNm!, fileType!),
      downloadUrl: DOWNLOAD,
      method: "POST",
      fetchedAt,
    });
  }

  for (const m of html.matchAll(DAM_PDF_RE)) {
    const path = m[0]!;
    const fileName = path.split("/").pop()!;
    const key = `dam:${fileName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      sourceId: "genesis-catalog",
      brandHint: "제네시스",
      fileKey: "",
      realFileNm: fileName,
      fileType: "DAM",
      kind: kindOf(fileName, "DAM"),
      downloadUrl: DOWNLOAD,
      method: "POST",
      publicUrl: `https://www.genesis.com${path}`,
      fetchedAt,
    });
  }

  return out;
}

/** DAM 직링크 후보 (액세서리 등). HEAD로 존재 확인용. */
export function genesisDamCandidateUrl(realFileNm: string) {
  return `${DAM_BASE}/${realFileNm}`;
}
