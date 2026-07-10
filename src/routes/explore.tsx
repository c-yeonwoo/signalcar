import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, TrendingUp, TrendingDown, Minus, Trophy, Info, ChevronRight, Sparkles } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "자동차 세계관 · 시그널카" },
      { name: "description", content: "브랜드·세그먼트·가격대·인기 순위까지 초보자도 한눈에 보는 자동차 지도" },
      { property: "og:title", content: "자동차 세계관 · 시그널카" },
      { property: "og:description", content: "브랜드·세그먼트·가격대·인기 순위까지 초보자도 한눈에 보는 자동차 지도" },
    ],
  }),
});

// ------- Mock data (탐색 전용) -------

type Brand = {
  id: string;
  name: string;
  country: string;
  emoji: string;
  models: number;
  priceBand: [number, number]; // 만원
  vibe: string;
};

const BRANDS: Brand[] = [
  { id: "hyundai", name: "현대", country: "🇰🇷 한국", emoji: "H", models: 22, priceBand: [1800, 12000], vibe: "국내 1위, 라인업 최다" },
  { id: "kia", name: "기아", country: "🇰🇷 한국", emoji: "K", models: 18, priceBand: [1700, 11500], vibe: "디자인·SUV 강점" },
  { id: "genesis", name: "제네시스", country: "🇰🇷 한국", emoji: "G", models: 7, priceBand: [5000, 20000], vibe: "국산 프리미엄" },
  { id: "renault", name: "르노코리아", country: "🇰🇷 한국", emoji: "R", models: 4, priceBand: [2600, 4500], vibe: "가성비 하이브리드" },
  { id: "kgm", name: "KG모빌리티", country: "🇰🇷 한국", emoji: "M", models: 6, priceBand: [2200, 6800], vibe: "SUV·픽업 특화" },
  { id: "bmw", name: "BMW", country: "🇩🇪 독일", emoji: "B", models: 14, priceBand: [5500, 25000], vibe: "수입 판매 1·2위" },
  { id: "benz", name: "벤츠", country: "🇩🇪 독일", emoji: "★", models: 15, priceBand: [6000, 30000], vibe: "럭셔리 대표" },
  { id: "toyota", name: "토요타", country: "🇯🇵 일본", emoji: "T", models: 9, priceBand: [3200, 8500], vibe: "하이브리드 원조" },
  { id: "tesla", name: "테슬라", country: "🇺🇸 미국", emoji: "T", models: 4, priceBand: [5200, 10500], vibe: "전기차 대중화" },
];

type RankRow = {
  rank: number;
  prev: number;
  model: string;
  brand: string;
  price: number; // 만원 (실계약 중앙값)
  units: number; // 이번달 판매대수
  history: number[];
  segment: string;
};

const SALES_RANK: RankRow[] = [
  { rank: 1, prev: 2, model: "쏘렌토", brand: "기아", price: 4720, units: 7132, history: [6100, 6400, 6800, 6900, 6950, 7132], segment: "중형 SUV" },
  { rank: 2, prev: 1, model: "싼타페", brand: "현대", price: 4820, units: 6890, history: [7400, 7200, 7000, 7000, 6950, 6890], segment: "중형 SUV" },
  { rank: 3, prev: 3, model: "쏘나타", brand: "현대", price: 3120, units: 5210, history: [4900, 5000, 5100, 5100, 5150, 5210], segment: "중형 세단" },
  { rank: 4, prev: 5, model: "K5", brand: "기아", price: 3050, units: 4680, history: [4100, 4200, 4300, 4400, 4500, 4680], segment: "중형 세단" },
  { rank: 5, prev: 4, model: "그랜저", brand: "현대", price: 4380, units: 4530, history: [5200, 5000, 4800, 4700, 4600, 4530], segment: "준대형 세단" },
  { rank: 6, prev: 8, model: "그랑콜레오스", brand: "르노코리아", price: 3680, units: 3980, history: [1200, 1800, 2600, 3200, 3600, 3980], segment: "중형 SUV" },
  { rank: 7, prev: 6, model: "카니발", brand: "기아", price: 5140, units: 3820, history: [4200, 4100, 4000, 3950, 3900, 3820], segment: "미니밴" },
  { rank: 8, prev: 7, model: "아반떼", brand: "현대", price: 2380, units: 3510, history: [3600, 3550, 3520, 3500, 3510, 3510], segment: "준중형 세단" },
  { rank: 9, prev: 11, model: "EV3", brand: "기아", price: 3980, units: 3210, history: [1600, 1900, 2400, 2700, 2900, 3210], segment: "소형 전기 SUV" },
  { rank: 10, prev: 9, model: "GV70", brand: "제네시스", price: 6820, units: 2890, history: [3100, 3000, 2950, 2920, 2900, 2890], segment: "중형 프리미엄 SUV" },
];

type SegmentTrend = {
  id: string;
  label: string;
  emoji: string;
  medianPrice: number; // 만원
  trendPct: number; // vs 3개월 전
  hot: string;
  history: number[];
};

const SEGMENTS: SegmentTrend[] = [
  { id: "compact", label: "준중형 세단", emoji: "🚗", medianPrice: 2350, trendPct: 1.2, hot: "아반떼 하이브리드", history: [2300, 2310, 2320, 2340, 2340, 2350] },
  { id: "mid-sedan", label: "중형 세단", emoji: "🚙", medianPrice: 3100, trendPct: -0.8, hot: "K5·쏘나타 프로모션", history: [3140, 3130, 3120, 3110, 3105, 3100] },
  { id: "mid-suv", label: "중형 SUV", emoji: "🚐", medianPrice: 4650, trendPct: 2.4, hot: "싼타페·쏘렌토 인상", history: [4520, 4540, 4570, 4600, 4630, 4650] },
  { id: "large-suv", label: "대형 SUV", emoji: "🚛", medianPrice: 6800, trendPct: 3.6, hot: "팰리세이드 완전변경", history: [6500, 6550, 6620, 6700, 6750, 6800] },
  { id: "ev-suv", label: "전기 SUV", emoji: "⚡", medianPrice: 5200, trendPct: -4.1, hot: "보조금 + 재고할인", history: [5450, 5420, 5350, 5290, 5240, 5200] },
  { id: "premium", label: "수입 프리미엄", emoji: "💎", medianPrice: 8900, trendPct: 0.4, hot: "BMW 5·벤츠 E 세대교체", history: [8850, 8860, 8870, 8880, 8890, 8900] },
];

// 세그먼트 × 가격대 매트릭스 (자동차 세계관 약도)
type MapCell = { label: string; hot?: boolean };
const PRICE_BANDS = ["~3천", "3~5천", "5~8천", "8천~"];
const BODY_TYPES = ["세단", "SUV", "미니밴", "전기차"] as const;
const WORLD_MAP: Record<(typeof BODY_TYPES)[number], MapCell[]> = {
  세단: [
    { label: "아반떼·K3" },
    { label: "쏘나타·K5", hot: true },
    { label: "그랜저·K8" },
    { label: "G80·5시리즈" },
  ],
  SUV: [
    { label: "코나·셀토스" },
    { label: "쏘렌토·싼타페", hot: true },
    { label: "팰리세이드·GV70" },
    { label: "GV80·X5" },
  ],
  미니밴: [
    { label: "-" },
    { label: "스타리아" },
    { label: "카니발" },
    { label: "V클래스" },
  ],
  전기차: [
    { label: "EV3·캐스퍼EV" },
    { label: "아이오닉5·EV6", hot: true },
    { label: "GV60·모델Y" },
    { label: "EV9·i7" },
  ],
};

// ------- UI helpers -------

function TrendBadge({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
        <Minus className="h-3 w-3" /> 보합
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[color:var(--color-signal-wait)]">
        <TrendingUp className="h-3 w-3" /> +{pct.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[color:var(--color-signal-buy)]">
      <TrendingDown className="h-3 w-3" /> {pct.toFixed(1)}%
    </span>
  );
}

function RankDelta({ rank, prev }: { rank: number; prev: number }) {
  const diff = prev - rank;
  if (diff === 0) return <span className="text-[10px] text-slate-400">—</span>;
  if (diff > 0)
    return <span className="text-[10px] font-semibold text-[color:var(--color-signal-buy)]">▲ {diff}</span>;
  return <span className="text-[10px] font-semibold text-rose-500">▼ {Math.abs(diff)}</span>;
}

function ExplorePage() {
  return (
    <ConsumerShell>
      <header className="px-5 pt-8 pb-2">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Compass className="h-3.5 w-3.5" /> 탐색
        </div>
        <h1 className="text-[24px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
          자동차 세계관 약도
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
          어떤 브랜드가 있고, 어떤 차가 잘 팔리고, 가격은 얼마인지 <br />
          초보자도 3분 안에 감을 잡을 수 있게 정리했어요.
        </p>
      </header>

      {/* 1) 세그먼트 × 가격대 매트릭스 */}
      <section className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-slate-800">차종 × 가격대 지도</h2>
          <span className="text-[10.5px] text-slate-400">🔥 이번 달 관심 급상승</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[64px_repeat(4,minmax(0,1fr))] text-[10.5px] bg-slate-50 border-b border-slate-100">
            <div className="p-2" />
            {PRICE_BANDS.map((p) => (
              <div key={p} className="p-2 text-center font-semibold text-slate-500">{p}</div>
            ))}
          </div>
          {BODY_TYPES.map((body) => (
            <div key={body} className="grid grid-cols-[64px_repeat(4,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
              <div className="p-2.5 text-[11.5px] font-semibold text-[color:var(--color-brand-navy)] bg-slate-50/60">
                {body}
              </div>
              {WORLD_MAP[body].map((cell, i) => (
                <div
                  key={i}
                  className={`p-2 text-[10.5px] leading-tight text-center border-l border-slate-100 flex items-center justify-center ${
                    cell.hot ? "bg-amber-50 text-amber-800 font-semibold" : "text-slate-600"
                  }`}
                >
                  {cell.hot && "🔥 "}
                  {cell.label}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
          예산과 차종만 정해도 후보가 3~4개로 좁혀져요. 셀을 참고해서 관심 차종을 골라보세요.
        </p>
      </section>

      {/* 2) 판매 순위 TOP 10 */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-slate-800 inline-flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> 이번 달 신차 판매 TOP 10
          </h2>
          <span className="text-[10.5px] text-slate-400">2026.06 · 국내 등록 기준</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {SALES_RANK.map((r) => (
            <div key={r.rank} className="px-4 py-3 flex items-center gap-3">
              <div className="w-6 text-center">
                <div className={`text-[15px] font-extrabold leading-none ${r.rank <= 3 ? "text-[color:var(--color-brand-blue)]" : "text-slate-700"}`}>
                  {r.rank}
                </div>
                <div className="mt-0.5"><RankDelta rank={r.rank} prev={r.prev} /></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                  {r.model}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {r.brand} · {r.segment} · 실계약 {r.price.toLocaleString()}만원~
                </div>
              </div>
              <div className="w-16 h-8">
                <Sparkline points={r.history} color="#3B82F6" />
              </div>
              <div className="w-14 text-right">
                <div className="text-[12px] font-bold text-slate-700">{r.units.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">대</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3) 세그먼트별 가격 추세 */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-slate-800 inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-blue)]" /> 세그먼트별 가격 추세
          </h2>
          <span className="text-[10.5px] text-slate-400">최근 3개월</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SEGMENTS.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-[11.5px] font-semibold text-slate-600 inline-flex items-center gap-1">
                  <span>{s.emoji}</span> {s.label}
                </div>
                <TrendBadge pct={s.trendPct} />
              </div>
              <div className="text-[18px] font-extrabold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                {s.medianPrice.toLocaleString()}
                <span className="text-[11px] font-medium text-slate-400"> 만원</span>
              </div>
              <div className="h-8 mt-1">
                <Sparkline
                  points={s.history}
                  color={s.trendPct >= 0 ? "#F59E0B" : "#16A34A"}
                />
              </div>
              <div className="text-[10.5px] text-slate-500 mt-1 leading-snug truncate">
                {s.hot}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4) 브랜드 지도 */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-slate-800">브랜드 지도</h2>
          <span className="text-[10.5px] text-slate-400">국내 판매 브랜드</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {BRANDS.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[13px] font-extrabold text-[color:var(--color-brand-navy)]">
                  {b.emoji}
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                    {b.name}
                  </div>
                  <div className="text-[9.5px] text-slate-400 truncate">{b.country}</div>
                </div>
              </div>
              <div className="mt-2 text-[10.5px] text-slate-500 leading-snug">{b.vibe}</div>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{b.models}개 모델</span>
                <span className="font-semibold text-slate-600">
                  {b.priceBand[0].toLocaleString()}~{b.priceBand[1].toLocaleString()}만
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5) 초보자 가이드 */}
      <section className="px-5 mt-6 mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-navy)] to-slate-800 text-white p-5">
          <div className="text-[11.5px] opacity-70 inline-flex items-center gap-1">
            <Info className="h-3 w-3" /> 처음이라면
          </div>
          <div className="text-[15px] font-bold mt-1 leading-snug">
            지도만 봐도 헷갈리면,<br />AI 코치와 1:1 인터뷰로 좁혀보세요.
          </div>
          <p className="text-[12px] opacity-80 mt-2 leading-relaxed">
            용도·인원·예산 7문항이면 후보 3대와 예상 견적까지 뽑아드려요.
          </p>
          <Link
            to="/coach"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-white text-[color:var(--color-brand-navy)] px-3.5 py-1.5 text-[12.5px] font-semibold active:scale-[0.98] transition"
          >
            AI 코치 시작 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </ConsumerShell>
  );
}
