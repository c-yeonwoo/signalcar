/**
 * 일일 Ingest Loop — 작업 레지스트리 (앱/워커 공유).
 *
 * 원칙:
 * - cadence=daily 작업만 루프가 자동 실행
 * - fingerprint(해시)가 같으면 DB/파일 갱신 스킵 (skipped_unchanged)
 * - 다나와 등 제품 DB 금지 소스는 previewOnly
 */
export type LoopCadence = "daily" | "weekly" | "monthly" | "on_demand";

export type LoopJobStatus =
  | "ok"
  | "skipped_unchanged"
  | "skipped_disabled"
  | "skipped_not_due"
  | "error"
  | "pending"
  | "never";

export type LoopJobDef = {
  id: string;
  name: string;
  description: string;
  cadence: LoopCadence;
  /** CLI 파이프라인 이름 (run.ts) */
  pipeline: string;
  domains: string[];
  targetTables: string[];
  /** true면 제품 DB 적재 없이 out/ · preview JSON만 */
  previewOnly?: boolean;
  /** 기본 활성화 */
  defaultEnabled: boolean;
  /** 변경 감지 방식 */
  changeDetect: "fingerprint" | "always" | "manual";
  requiresEnv?: string[];
};

/** 루프가 관리하는 작업 (하루 1회 스케줄 대상 중심) */
export const LOOP_JOBS: LoopJobDef[] = [
  {
    id: "catalog-index",
    name: "공식 카탈로그 PDF 인덱스",
    description: "현대·기아·제네시스 공개 가격표/카탈로그 URL 수집. URL 집합 해시가 같으면 스킵.",
    cadence: "daily",
    pipeline: "catalog-index",
    domains: ["catalog", "msrp"],
    targetTables: ["source_documents"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
  },
  {
    id: "news-index",
    name: "공식 뉴스룸 인덱스",
    description: "현대·기아·제네시스 뉴스 링크. 제목·URL 해시 동일 시 스킵.",
    cadence: "daily",
    pipeline: "news-index",
    domains: ["news"],
    targetTables: ["news_items"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
  },
  {
    id: "aggregate-signals",
    name: "가격 시그널 집계",
    description: "deal_reports → price_signals. 표본/중앙값 fingerprint 동일 시 스킵.",
    cadence: "daily",
    pipeline: "aggregate-signals",
    domains: ["deal_price"],
    targetTables: ["price_signals"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
    requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    id: "sales-kot",
    name: "교통안전공단 신규등록",
    description: "전월(또는 지정월) 신규등록 건수. count fingerprint 동일 시 스킵.",
    cadence: "daily",
    pipeline: "sales-kot",
    domains: ["sales"],
    targetTables: ["sales_stats"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
    requiresEnv: ["DATA_GO_KR_API_KEY"],
  },
  {
    id: "danawa-sales-preview",
    name: "다나와 판매조건 프리뷰",
    description: "그랜저 등 추적 모델 판매조건 → Benefit JSON. 제품 DB 미적재.",
    cadence: "daily",
    pipeline: "danawa-sales",
    domains: ["promo"],
    targetTables: [],
    previewOnly: true,
    defaultEnabled: true,
    changeDetect: "fingerprint",
  },
  {
    id: "car-features",
    name: "Brain 피처·타이밍",
    description:
      "시그널·판매·프로모·페이스리프트 → car_features_daily + timing_verdict. Brain v1 규칙.",
    cadence: "daily",
    pipeline: "car-features",
    domains: ["deal_price", "promo", "sales"],
    targetTables: ["car_features_daily", "price_signals"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
    requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    id: "catalog-parse",
    name: "OEM 가격표 PDF→MSRP",
    description:
      "현대·기아·제네시스 가격표 PDF 텍스트 파싱 → vehicles/trims.base_price. URL·트림 해시 동일 시 스킵.",
    cadence: "daily",
    pipeline: "catalog-parse",
    domains: ["catalog", "msrp"],
    targetTables: ["vehicles", "trims", "source_documents"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
    requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  {
    id: "promo-etl",
    name: "공식 프로모션 월 ETL",
    description:
      "기아 이달의 구매 혜택 HTML → official_promotions + car_profiles.promo_*. 금액 집합 해시 동일 시 스킵.",
    cadence: "daily",
    pipeline: "promo-etl",
    domains: ["promo"],
    targetTables: ["official_promotions", "car_profiles"],
    defaultEnabled: true,
    changeDetect: "fingerprint",
    requiresEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
];

export type LoopJobRuntime = {
  jobId: string;
  enabled: boolean;
  lastStatus: LoopJobStatus;
  lastRunAt: string | null;
  lastChangedAt: string | null;
  lastFingerprint: string | null;
  lastError: string | null;
  lastStats: Record<string, unknown>;
};

export type LoopStatusFile = {
  version: 1;
  updatedAt: string;
  schedule: {
    timezone: string;
    cron: string;
    note: string;
  };
  jobs: LoopJobRuntime[];
  recentRuns: Array<{
    id: string;
    jobId: string;
    status: LoopJobStatus;
    startedAt: string;
    finishedAt: string | null;
    stats: Record<string, unknown>;
    error: string | null;
  }>;
};

export const LOOP_SCHEDULE = {
  timezone: "Asia/Seoul",
  cron: "0 6 * * *",
  note: "매일 06:00 KST — GitHub Actions 또는 bun workers/ingest/run.ts loop --once",
} as const;

export function emptyLoopStatus(): LoopStatusFile {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    schedule: { ...LOOP_SCHEDULE },
    jobs: LOOP_JOBS.map((j) => ({
      jobId: j.id,
      enabled: j.defaultEnabled,
      lastStatus: "never",
      lastRunAt: null,
      lastChangedAt: null,
      lastFingerprint: null,
      lastError: null,
      lastStats: {},
    })),
    recentRuns: [],
  };
}

export function findLoopJob(id: string) {
  return LOOP_JOBS.find((j) => j.id === id);
}
