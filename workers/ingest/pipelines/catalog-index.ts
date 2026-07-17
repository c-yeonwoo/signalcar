/**
 * 공식 카탈로그/가격표 통합 인덱싱.
 * 브랜드별 전용 파이프라인 → CatalogDoc 정규화.
 * PDF 파싱(트림·MSRP)은 catalog-parse 파이프라인.
 */
import { indexHyundaiCatalogPdfs } from "./hyundai-catalog";
import { indexKiaCatalogPdfs } from "./kia-catalog";
import { indexGenesisCatalog } from "./genesis-catalog";

export type CatalogDoc = {
  sourceId: string;
  brandHint: string;
  url: string;
  fileName: string;
  kind?: string;
  meta?: Record<string, unknown>;
  fetchedAt: string;
};

export async function indexOfficialCatalogPdfs(opts?: {
  sourceIds?: string[];
  fetchImpl?: typeof fetch;
}): Promise<CatalogDoc[]> {
  const ids = opts?.sourceIds;
  const allow = (id: string) => !ids || ids.includes(id);
  const fetchFn = opts?.fetchImpl ?? fetch;
  const out: CatalogDoc[] = [];
  const seen = new Set<string>();

  const push = (d: CatalogDoc) => {
    const key = d.url || `${d.sourceId}:${d.fileName}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  };

  if (allow("hyundai-catalog")) {
    console.log("[catalog-index] hyundai gateway API");
    const docs = await indexHyundaiCatalogPdfs({ fetchImpl: fetchFn });
    for (const d of docs) {
      push({
        sourceId: d.sourceId,
        brandHint: d.brandHint,
        url: d.url,
        fileName: d.fileName,
        kind: d.kind,
        meta: {
          carCode: d.carCode,
          carName: d.carName,
          carEngName: d.carEngName,
          carTypeCode: d.carTypeCode,
          modified: d.modified,
        },
        fetchedAt: d.fetchedAt,
      });
    }
    console.log(`[catalog-index] hyundai-catalog: ${docs.length}`);
  }

  if (allow("kia-catalog")) {
    console.log("[catalog-index] kia DAM + seed");
    const docs = await indexKiaCatalogPdfs({ fetchImpl: fetchFn });
    for (const d of docs) {
      push({
        sourceId: d.sourceId,
        brandHint: d.brandHint,
        url: d.url,
        fileName: d.fileName,
        kind: d.kind,
        meta: { slug: d.slug },
        fetchedAt: d.fetchedAt,
      });
    }
    console.log(`[catalog-index] kia-catalog: ${docs.length}`);
  }

  if (allow("genesis-catalog")) {
    console.log("[catalog-index] genesis download-center HTML");
    const docs = await indexGenesisCatalog({ fetchImpl: fetchFn });
    for (const d of docs) {
      push({
        sourceId: d.sourceId,
        brandHint: d.brandHint,
        url:
          d.publicUrl ??
          `${d.downloadUrl}?file_key=${encodeURIComponent(d.fileKey)}`,
        fileName: d.realFileNm,
        kind: d.kind,
        meta: {
          fileKey: d.fileKey,
          fileType: d.fileType,
          method: d.method,
          downloadUrl: d.downloadUrl,
        },
        fetchedAt: d.fetchedAt,
      });
    }
    console.log(`[catalog-index] genesis-catalog: ${docs.length}`);
  }

  return out;
}
