/**
 * 교통안전공단 신규등록 OpenAPI 클라이언트 스켈레톤.
 * 키: DATA_GO_KR_API_KEY (공공데이터포털)
 *
 * 엔드포인트는 포털 신청 후 발급되는 서비스 URL을 사용.
 * 문서: https://www.data.go.kr/data/15059401/openapi.do
 */
export type KotNewRegQuery = {
  year: string; // YYYY
  month: string; // MM
  /** optional filters — 포털 스펙에 맞게 확장 */
  carTypeCode?: string;
  regionCode?: string;
  fuelCode?: string;
};

export type KotNewRegRow = {
  year: string;
  month: string;
  carTypeCode?: string;
  regionCode?: string;
  fuelCode?: string;
  carNameCode?: string;
  count: number;
  raw: Record<string, unknown>;
};

/**
 * 실제 호출은 서비스 URL이 환경별로 다름.
 * DATA_GO_KR_SERVICE_URL 미설정 시 dry 응답.
 */
export async function fetchKotNewRegistrations(
  q: KotNewRegQuery,
): Promise<{ rows: KotNewRegRow[]; skipped?: string }> {
  const key = process.env.DATA_GO_KR_API_KEY;
  const serviceUrl = process.env.DATA_GO_KR_SERVICE_URL;

  if (!key || !serviceUrl) {
    return {
      rows: [],
      skipped: "Set DATA_GO_KR_API_KEY and DATA_GO_KR_SERVICE_URL to enable",
    };
  }

  const url = new URL(serviceUrl);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("regYy", q.year);
  url.searchParams.set("regMt", q.month);
  if (q.carTypeCode) url.searchParams.set("vhctyAsortCode", q.carTypeCode);
  if (q.regionCode) url.searchParams.set("regGovCode", q.regionCode);
  if (q.fuelCode) url.searchParams.set("useFuelCode", q.fuelCode);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("type", "json");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`KOTSA API HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    response?: { body?: { items?: { item?: Record<string, unknown>[] | Record<string, unknown> } } };
  };
  const rawItems = json.response?.body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const rows: KotNewRegRow[] = items.map((it) => ({
    year: q.year,
    month: q.month,
    carTypeCode: String(it.vhctyAsortCode ?? ""),
    regionCode: String(it.regGovCode ?? ""),
    fuelCode: String(it.useFuelCode ?? ""),
    carNameCode: String(it.vhrno ?? it.carNameCode ?? ""),
    count: Number(it.regCnt ?? it.cnt ?? 0),
    raw: it,
  }));

  return { rows };
}
