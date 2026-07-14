/**
 * 교통안전공단 신규등록 OpenAPI.
 * 문서: https://www.data.go.kr/data/15059401/openapi.do
 *
 * 기본 엔드포인트:
 *   https://apis.data.go.kr/B553881/newRegistlnfoService_02/getnewRegistlnfoService02
 *
 * 응답은 필터 조건에 맞는 통계건수(dtaCo) 1건.
 * 차종·지역·연료 등을 조합해 여러 번 호출해 시계열/세부를 구성.
 */
export type KotNewRegQuery = {
  year: string; // YYYY
  month: string; // MM
  carTypeCode?: string; // vhctyAsortCode
  regionCode?: string; // registGrcCode
  fuelCode?: string; // useFuelCode
  carNameCode?: string; // cnmCode
  purpose?: string; // prposSeNm
  sex?: string; // sexdstn
  ageBand?: string; // agrde
  displacementCode?: string; // dsplvlCode
  origin?: string; // hmmdImpSeNm 국산|외산
  modelYear?: string; // prye
};

export type KotNewRegRow = {
  year: string;
  month: string;
  carTypeCode?: string;
  regionCode?: string;
  fuelCode?: string;
  carNameCode?: string;
  count: number;
  resultCode?: string;
  resultMsg?: string;
  raw: Record<string, unknown>;
};

export const DEFAULT_KOT_SERVICE_URL =
  "https://apis.data.go.kr/B553881/newRegistlnfoService_02/getnewRegistlnfoService02";

function parseXmlCount(xml: string): {
  resultCode?: string;
  resultMsg?: string;
  count: number;
} {
  const code = xml.match(/<resultCode>([^<]*)<\/resultCode>/i)?.[1];
  const msg = xml.match(/<resultMsg>([^<]*)<\/resultMsg>/i)?.[1];
  const dta = xml.match(/<dtaCo>([^<]*)<\/dtaCo>/i)?.[1];
  return {
    resultCode: code,
    resultMsg: msg,
    count: Number(dta ?? 0),
  };
}

/**
 * DATA_GO_KR_API_KEY 필수.
 * DATA_GO_KR_SERVICE_URL 없으면 공식 기본 엔드포인트 사용.
 */
export async function fetchKotNewRegistrations(
  q: KotNewRegQuery,
): Promise<{ rows: KotNewRegRow[]; skipped?: string }> {
  const key = process.env.DATA_GO_KR_API_KEY;
  const serviceUrl = process.env.DATA_GO_KR_SERVICE_URL ?? DEFAULT_KOT_SERVICE_URL;

  if (!key) {
    return {
      rows: [],
      skipped: "Set DATA_GO_KR_API_KEY to enable (optional: DATA_GO_KR_SERVICE_URL)",
    };
  }

  const url = new URL(serviceUrl);
  // serviceKey is often required URL-encoded by the gateway
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("registYy", q.year);
  url.searchParams.set("registMt", q.month.padStart(2, "0"));
  if (q.carTypeCode) url.searchParams.set("vhctyAsortCode", q.carTypeCode);
  if (q.regionCode) url.searchParams.set("registGrcCode", q.regionCode);
  if (q.fuelCode) url.searchParams.set("useFuelCode", q.fuelCode);
  if (q.carNameCode) url.searchParams.set("cnmCode", q.carNameCode);
  if (q.purpose) url.searchParams.set("prposSeNm", q.purpose);
  if (q.sex) url.searchParams.set("sexdstn", q.sex);
  if (q.ageBand) url.searchParams.set("agrde", q.ageBand);
  if (q.displacementCode) url.searchParams.set("dsplvlCode", q.displacementCode);
  if (q.origin) url.searchParams.set("hmmdImpSeNm", q.origin);
  if (q.modelYear) url.searchParams.set("prye", q.modelYear);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/xml, application/json, */*" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`KOTSA API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  let resultCode: string | undefined;
  let resultMsg: string | undefined;
  let count = 0;
  let raw: Record<string, unknown> = { text: text.slice(0, 2000) };

  if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
    try {
      const json = JSON.parse(text) as {
        response?: {
          header?: { resultCode?: string; resultMsg?: string };
          body?: { dtaCo?: string | number };
        };
      };
      resultCode = json.response?.header?.resultCode;
      resultMsg = json.response?.header?.resultMsg;
      count = Number(json.response?.body?.dtaCo ?? 0);
      raw = json as unknown as Record<string, unknown>;
    } catch {
      /* fall through to xml */
    }
  } else {
    const parsed = parseXmlCount(text);
    resultCode = parsed.resultCode;
    resultMsg = parsed.resultMsg;
    count = parsed.count;
  }

  if (resultCode && resultCode !== "00" && resultCode !== "0") {
    throw new Error(`KOTSA API error ${resultCode}: ${resultMsg ?? "unknown"}`);
  }

  const rows: KotNewRegRow[] = [
    {
      year: q.year,
      month: q.month.padStart(2, "0"),
      carTypeCode: q.carTypeCode,
      regionCode: q.regionCode,
      fuelCode: q.fuelCode,
      carNameCode: q.carNameCode,
      count,
      resultCode,
      resultMsg,
      raw,
    },
  ];

  return { rows };
}
