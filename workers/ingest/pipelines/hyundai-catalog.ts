/**
 * 현대 공식 카탈로그·가격표 인덱스.
 * API: GET /kr/ko/gw/product/v1/product/car/catalog-price (공개, 키 불필요)
 * PDF: https://www.hyundai.com/contents/repn-car/catalog/*.pdf
 *   — 브라우저 동일 출처에서는 200, 일부 봇 IP는 403 가능.
 */
export type HyundaiCatalogCar = {
  carCode: string;
  carName: string;
  carEngName?: string;
  carTypeCode?: string;
  carTypeName?: string;
  catalogFilePath?: string;
  catalogFileModifyDate?: string;
  pTableFilePath?: string;
  pTableFileModifyDate?: string;
};

export type HyundaiCatalogDoc = {
  sourceId: "hyundai-catalog";
  brandHint: "현대";
  carCode: string;
  carName: string;
  carEngName?: string;
  carTypeCode?: string;
  kind: "price" | "catalog";
  url: string;
  fileName: string;
  modified?: string;
  fetchedAt: string;
};

const API =
  "https://www.hyundai.com/kr/ko/gw/product/v1/product/car/catalog-price";
const CDN = "https://www.hyundai.com";

const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

export async function fetchHyundaiCatalogCars(
  fetchImpl: typeof fetch = fetch,
): Promise<HyundaiCatalogCar[]> {
  const res = await fetchImpl(API, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
      Referer: "https://www.hyundai.com/kr/ko/e/vehicles/catalog-price-download",
    },
  });
  if (!res.ok) throw new Error(`hyundai catalog-price HTTP ${res.status}`);
  const json = (await res.json()) as { data?: HyundaiCatalogCar[] } | HyundaiCatalogCar[];
  return Array.isArray(json) ? json : (json.data ?? []);
}

export async function indexHyundaiCatalogPdfs(opts?: {
  fetchImpl?: typeof fetch;
}): Promise<HyundaiCatalogDoc[]> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const cars = await fetchHyundaiCatalogCars(fetchFn);
  const fetchedAt = new Date().toISOString();
  const out: HyundaiCatalogDoc[] = [];

  for (const c of cars) {
    if (!c.carCode) continue;
    if (c.pTableFilePath) {
      out.push({
        sourceId: "hyundai-catalog",
        brandHint: "현대",
        carCode: c.carCode,
        carName: c.carName,
        carEngName: c.carEngName,
        carTypeCode: c.carTypeCode,
        kind: "price",
        url: CDN + c.pTableFilePath,
        fileName: c.pTableFilePath.split("/").pop() ?? c.pTableFilePath,
        modified: c.pTableFileModifyDate,
        fetchedAt,
      });
    }
    if (c.catalogFilePath) {
      out.push({
        sourceId: "hyundai-catalog",
        brandHint: "현대",
        carCode: c.carCode,
        carName: c.carName,
        carEngName: c.carEngName,
        carTypeCode: c.carTypeCode,
        kind: "catalog",
        url: CDN + c.catalogFilePath,
        fileName: c.catalogFilePath.split("/").pop() ?? c.catalogFilePath,
        modified: c.catalogFileModifyDate,
        fetchedAt,
      });
    }
  }

  return out;
}
