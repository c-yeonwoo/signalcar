/**
 * SignalCar 데이터 수집 소스 레지스트리.
 *
 * 정책: 경쟁사(겟차·다나와·엔카) 크롤링 금지 (admin.deal-reports).
 * 허용: 공식 제조사 공개 자료, 공공 API, 1st-party(deal_reports), 유료 라이선스 DB.
 */
export type SourceKind =
  | "official_catalog"
  | "official_promo"
  | "official_news"
  | "official_sales_ir"
  | "public_api"
  | "paid_db"
  | "first_party"
  | "manual_admin";

export type DataDomain =
  | "catalog" // brands/vehicles/trims
  | "options" // trim_options
  | "msrp" // base_price
  | "promo" // official_promotions
  | "deal_price" // deal_reports → price_signals
  | "sales" // sales_stats
  | "news" // news / facelift
  | "specs" // fuel, efficiency
  | "used_band"; // new vs used (optional, licensed)

export type IngestSource = {
  id: string;
  name: string;
  kind: SourceKind;
  domains: DataDomain[];
  url: string;
  method: "pdf_index" | "html" | "openapi" | "rss" | "form" | "manual" | "aggregate" | "license";
  cadence: "daily" | "weekly" | "monthly" | "realtime" | "on_demand";
  legal: "allowed" | "license_required" | "forbidden";
  notes: string;
  targetTables: string[];
};

/** 제품 공개 적재 금지 — 개인 로컬 조사용 CLI(`danawa-private`)는 별도 */
export const FORBIDDEN_SOURCES = [
  { id: "getcha", name: "겟차", reason: "경쟁사 ToS · 제품 공개 적재 금지" },
  {
    id: "danawa-auto",
    name: "다나와 자동차",
    reason: "제품 DB/UI 적재 금지 (개인 로컬: run.ts danawa-private)",
  },
  { id: "encar", name: "엔카", reason: "경쟁사 ToS · 제품 공개 적재 금지" },
  { id: "kbchachacha", name: "KB차차차", reason: "경쟁사 ToS" },
] as const;

export const INGEST_SOURCES: IngestSource[] = [
  // ─── 공식 카탈로그 / MSRP / 옵션 ───
  {
    id: "hyundai-catalog",
    name: "현대 카탈로그·가격표",
    kind: "official_catalog",
    domains: ["catalog", "msrp", "options", "specs"],
    url: "https://www.hyundai.com/kr/ko/e/vehicles/catalog-price-download",
    method: "pdf_index",
    cadence: "monthly",
    legal: "allowed",
    notes:
      "공개 GW API /kr/ko/gw/product/v1/product/car/catalog-price → contents/repn-car/catalog/*.pdf. API 키 불필요.",
    targetTables: ["brands", "vehicles", "trims", "trim_options"],
  },
  {
    id: "kia-catalog",
    name: "기아 카탈로그·가격표",
    kind: "official_catalog",
    domains: ["catalog", "msrp", "options", "specs"],
    url: "https://www.kia.com/kr/vehicles/catalog-price",
    method: "pdf_index",
    cadence: "monthly",
    legal: "allowed",
    notes:
      "공개 DAM PDF (/content/dam/kwp/.../pdf/{catalog|price}/). kwpapi는 시스템 토큰 필요(미사용).",
    targetTables: ["brands", "vehicles", "trims", "trim_options"],
  },
  {
    id: "genesis-catalog",
    name: "제네시스 다운로드 센터",
    kind: "official_catalog",
    domains: ["catalog", "msrp", "options"],
    url: "https://www.genesis.com/kr/ko/support/download-center/genesis-models.html",
    method: "pdf_index",
    cadence: "monthly",
    legal: "allowed",
    notes:
      "HTML viewPdf(fileKey) 인덱스. PDF는 POST /wsvc/kr/api/v2/downloadcenter/pdfdownload. API 키 불필요.",
    targetTables: ["brands", "vehicles", "trims", "trim_options"],
  },
  {
    id: "renault-kr",
    name: "르노코리아 공식",
    kind: "official_catalog",
    domains: ["catalog", "msrp", "promo", "news"],
    url: "https://www.renault.co.kr/",
    method: "html",
    cadence: "weekly",
    legal: "allowed",
    notes: "모델/견적/프로모션 페이지. 그랑콜레오스 등.",
    targetTables: ["vehicles", "trims", "official_promotions"],
  },
  {
    id: "kgm",
    name: "KG모빌리티 공식",
    kind: "official_catalog",
    domains: ["catalog", "msrp", "promo", "news"],
    url: "https://www.kg-mobility.com/",
    method: "html",
    cadence: "weekly",
    legal: "allowed",
    notes: "토레스 등 SUV 라인업·가격·프로모션.",
    targetTables: ["vehicles", "trims", "official_promotions"],
  },

  // ─── 공식 프로모션 ───
  {
    id: "kia-special-offers",
    name: "기아 스페셜 오퍼",
    kind: "official_promo",
    domains: ["promo"],
    url: "https://www.kia.com/kr/buy/special-offers",
    method: "html",
    cadence: "weekly",
    legal: "allowed",
    notes: "월별 공식 할인·금융 조건.",
    targetTables: ["official_promotions"],
  },
  {
    id: "hyundai-purchase-guide",
    name: "현대 구매 가이드·혜택",
    kind: "official_promo",
    domains: ["promo"],
    url: "https://www.hyundai.com/kr/ko/e/vehicles",
    method: "html",
    cadence: "weekly",
    legal: "allowed",
    notes: "차종별 구매 혜택·금융 이벤트 페이지.",
    targetTables: ["official_promotions"],
  },

  // ─── 판매 / 등록 통계 ───
  {
    id: "kama-monthly",
    name: "KAMA 월별 자동차산업동향",
    kind: "official_sales_ir",
    domains: ["sales"],
    url: "https://www.kama.or.kr/NewsController?boardmaster_id=industry&cmd=L&menunum=0004",
    method: "pdf_index",
    cadence: "monthly",
    legal: "allowed",
    notes: "국산 완성차 내수·생산·수출 PDF. 모델별 세부는 제한적일 수 있음.",
    targetTables: ["sales_stats"],
  },
  {
    id: "hyundai-ir-sales",
    name: "현대 IR 판매실적",
    kind: "official_sales_ir",
    domains: ["sales"],
    url: "https://www.hyundai.com/worldwide/ko/company/ir/ir-resources/sales-results",
    method: "html",
    cadence: "monthly",
    legal: "allowed",
    notes: "브랜드 단위 판매. 트림 단위는 아님.",
    targetTables: ["sales_stats"],
  },
  {
    id: "kotsa-new-reg",
    name: "교통안전공단 신규등록 OpenAPI",
    kind: "public_api",
    domains: ["sales"],
    url: "https://www.data.go.kr/data/15059401/openapi.do",
    method: "openapi",
    cadence: "monthly",
    legal: "allowed",
    notes: "공공데이터포털 인증키 필요. 차종·연료·지역별 신규등록 통계.",
    targetTables: ["sales_stats"],
  },
  {
    id: "motie-auto-industry",
    name: "산업통상부 기업별 자동차 산업 현황",
    kind: "public_api",
    domains: ["sales"],
    url: "https://www.data.go.kr/data/15051117/fileData.do",
    method: "openapi",
    cadence: "monthly",
    legal: "allowed",
    notes: "완성차 7개사 내수·수출 파일 데이터 (KAMA 출처).",
    targetTables: ["sales_stats"],
  },
  {
    id: "kaida-reg-db",
    name: "KAIDA 자동차 등록 DB",
    kind: "paid_db",
    domains: ["sales", "deal_price"],
    url: "https://www.kaida.co.kr/ko/service/dbService.do",
    method: "license",
    cadence: "monthly",
    legal: "license_required",
    notes: "국토부 기반 유료 DB. 취득가·모델 세부가 풍부. 계약 후 ETL.",
    targetTables: ["sales_stats", "price_signals"],
  },

  // ─── 신차 뉴스 / 연식변경 ───
  {
    id: "hyundai-newsroom",
    name: "현대 뉴스룸",
    kind: "official_news",
    domains: ["news"],
    url: "https://www.hyundai.com/kr/ko/company/newsroom",
    method: "html",
    cadence: "daily",
    legal: "allowed",
    notes: "신차 출시·부분변경 보도자료.",
    targetTables: ["news_items"],
  },
  {
    id: "kia-news",
    name: "기아 뉴스",
    kind: "official_news",
    domains: ["news"],
    url: "https://www.kia.com/kr/discover-kia/news",
    method: "html",
    cadence: "daily",
    legal: "allowed",
    notes: "신차·프로모션 뉴스.",
    targetTables: ["news_items"],
  },
  {
    id: "genesis-news",
    name: "제네시스 뉴스룸",
    kind: "official_news",
    domains: ["news"],
    url: "https://newsroom.genesis.com/ko-ko/",
    method: "html",
    cadence: "daily",
    legal: "allowed",
    notes: "공식 뉴스룸(newsroom.genesis.com). 신차·보도자료.",
    targetTables: ["news_items"],
  },

  // ─── 1st party / 내부 ───
  {
    id: "deal-reports",
    name: "시그널카 계약 공유",
    kind: "first_party",
    domains: ["deal_price"],
    url: "/report",
    method: "form",
    cadence: "realtime",
    legal: "allowed",
    notes: "실계약가 해자. OCR 워커 + 검수 후 price_signals 집계.",
    targetTables: ["deal_reports", "price_signals"],
  },
  {
    id: "aggregate-signals",
    name: "price_signals 집계 워커",
    kind: "first_party",
    domains: ["deal_price"],
    url: "internal://aggregate-signals",
    method: "aggregate",
    cadence: "daily",
    legal: "allowed",
    notes: "deal_reports 월별 median/sample → timing_verdict.",
    targetTables: ["price_signals"],
  },
  {
    id: "admin-cms",
    name: "Admin CMS 수동 입력",
    kind: "manual_admin",
    domains: ["catalog", "options", "msrp", "promo"],
    url: "/admin",
    method: "manual",
    cadence: "on_demand",
    legal: "allowed",
    notes: "크롤러 실패·예외 차종 보정.",
    targetTables: ["brands", "vehicles", "trims", "trim_options", "official_promotions"],
  },

  // ─── 참고용 API (제원, 커넥티드 — 신차 시세와 다름) ───
  {
    id: "hyundai-developers",
    name: "Hyundai Developers 데이터 API",
    kind: "public_api",
    domains: ["specs", "catalog"],
    url: "https://developers.hyundai.com/web/v1/hyundai/data_api",
    method: "openapi",
    cadence: "on_demand",
    legal: "license_required",
    notes: "커넥티드카 제원/운행. 신차 시세용 아님. 파트너 승인 필요.",
    targetTables: ["trims", "trim_options"],
  },
];

export function sourcesByDomain(domain: DataDomain) {
  return INGEST_SOURCES.filter((s) => s.domains.includes(domain) && s.legal !== "forbidden");
}

export function allowedSources() {
  return INGEST_SOURCES.filter((s) => s.legal === "allowed");
}
