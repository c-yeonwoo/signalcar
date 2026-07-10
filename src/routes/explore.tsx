import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronRight, ArrowUpRight } from "lucide-react";
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
  mark: string;
  models: number;
  priceBand: [number, number]; // 만원
  vibe: string;
};

const BRANDS: Brand[] = [
  { id: "hyundai", name: "현대", country: "한국", mark: "H", models: 22, priceBand: [1800, 12000], vibe: "국내 1위, 라인업 최다" },
  { id: "kia", name: "기아", country: "한국", mark: "K", models: 18, priceBand: [1700, 11500], vibe: "디자인·SUV 강점" },
  { id: "genesis", name: "제네시스", country: "한국", mark: "G", models: 7, priceBand: [5000, 20000], vibe: "국산 프리미엄" },
  { id: "renault", name: "르노코리아", country: "한국", mark: "R", models: 4, priceBand: [2600, 4500], vibe: "가성비 하이브리드" },
  { id: "kgm", name: "KG모빌리티", country: "한국", mark: "M", models: 6, priceBand: [2200, 6800], vibe: "SUV·픽업 특화" },
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
  medianPrice: number; // 만원
  trendPct: number; // vs 3개월 전
  hot: string;
  history: number[];
};

const SEGMENTS: SegmentTrend[] = [
  { id: "compact", label: "준중형 세단", medianPrice: 2350, trendPct: 1.2, hot: "아반떼 하이브리드", history: [2300, 2310, 2320, 2340, 2340, 2350] },
  { id: "mid-sedan", label: "중형 세단", medianPrice: 3100, trendPct: -0.8, hot: "K5·쏘나타 프로모션", history: [3140, 3130, 3120, 3110, 3105, 3100] },
  { id: "mid-suv", label: "중형 SUV", medianPrice: 4650, trendPct: 2.4, hot: "싼타페·쏘렌토 인상", history: [4520, 4540, 4570, 4600, 4630, 4650] },
  { id: "large-suv", label: "대형 SUV", medianPrice: 6800, trendPct: 3.6, hot: "팰리세이드 완전변경", history: [6500, 6550, 6620, 6700, 6750, 6800] },
  { id: "ev-suv", label: "전기 SUV", medianPrice: 5200, trendPct: -4.1, hot: "보조금 + 재고할인", history: [5450, 5420, 5350, 5290, 5240, 5200] },
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
    return <span className="text-[10px] font-semibold text-[color:var(--color-signal-buy)]">+{diff}</span>;
  return <span className="text-[10px] font-semibold text-rose-500">−{Math.abs(diff)}</span>;
}

type Tab = "map" | "rank" | "brand";
const TABS: { id: Tab; label: string }[] = [
  { id: "map", label: "지도" },
  { id: "rank", label: "판매 순위" },
  { id: "brand", label: "브랜드" },
];

function ExplorePage() {
  const [tab, setTab] = useState<Tab>("map");

  return (
    <ConsumerShell>
      <header className="px-5 pt-8 pb-4">
        <div className="text-[11px] tracking-[0.14em] text-slate-400 uppercase">Explore</div>
        <h1 className="text-[24px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
          자동차 지도
        </h1>
        <p className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">
          국산 신차 기준 · 예산과 차종부터 좁혀 보세요.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="px-5">
        <div className="inline-flex bg-slate-100 rounded-full p-1 w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[12.5px] py-1.5 rounded-full font-semibold transition ${
                tab === t.id ? "bg-white text-[color:var(--color-brand-navy)] shadow-sm" : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "map" && (
        <>
          {/* Matrix */}
          <section className="px-5 mt-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-slate-700">차종 × 가격대</h2>
              <span className="text-[10.5px] text-slate-400">색상 = 인기</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-[56px_repeat(4,minmax(0,1fr))] text-[10px] border-b border-slate-100">
                <div />
                {PRICE_BANDS.map((p) => (
                  <div key={p} className="py-2 text-center font-medium text-slate-400">{p}</div>
                ))}
              </div>
              {BODY_TYPES.map((body) => (
                <div key={body} className="grid grid-cols-[56px_repeat(4,minmax(0,1fr))] border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-3 text-[11.5px] font-semibold text-[color:var(--color-brand-navy)] flex items-center">
                    {body}
                  </div>
                  {WORLD_MAP[body].map((cell, i) => (
                    <div
                      key={i}
                      className={`px-1 py-3 text-[10.5px] leading-tight text-center border-l border-slate-50 flex items-center justify-center ${
                        cell.hot
                          ? "bg-[color:var(--color-signal-buy)]/10 text-[color:var(--color-signal-buy)] font-semibold"
                          : cell.label === "-"
                            ? "text-slate-300"
                            : "text-slate-600"
                      }`}
                    >
                      {cell.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Segment trends */}
          <section className="px-5 mt-6">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-slate-700">세그먼트 가격 추세</h2>
              <span className="text-[10.5px] text-slate-400">최근 3개월</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              {SEGMENTS.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800">{s.label}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">{s.hot}</div>
                  </div>
                  <div className="w-14 h-7">
                    <Sparkline values={s.history} color={s.trendPct >= 0 ? "#F59E0B" : "#16A34A"} />
                  </div>
                  <div className="w-20 text-right">
                    <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)]">
                      {s.medianPrice.toLocaleString()}
                      <span className="text-[10px] font-medium text-slate-400"> 만</span>
                    </div>
                    <div className="mt-0.5"><TrendBadge pct={s.trendPct} /></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "rank" && (
        <section className="px-5 mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-[13px] font-semibold text-slate-700">이번 달 판매 TOP 10</h2>
            <span className="text-[10.5px] text-slate-400">2026.06</span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {SALES_RANK.map((r) => (
              <div key={r.rank} className="px-4 py-3 flex items-center gap-3">
                <div className="w-6 text-center">
                  <div className={`text-[15px] font-extrabold leading-none ${r.rank <= 3 ? "text-[color:var(--color-brand-blue)]" : "text-slate-400"}`}>
                    {r.rank}
                  </div>
                  <div className="mt-0.5"><RankDelta rank={r.rank} prev={r.prev} /></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                    {r.model}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                    {r.brand} · {r.segment}
                  </div>
                </div>
                <div className="w-12 h-6">
                  <Sparkline values={r.history} color="#3B82F6" />
                </div>
                <div className="w-16 text-right">
                  <div className="text-[12px] font-bold text-slate-700">{r.units.toLocaleString()}<span className="text-[9.5px] text-slate-400 font-medium"> 대</span></div>
                  <div className="text-[10px] text-slate-400">{r.price.toLocaleString()}만~</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "brand" && (
        <section className="px-5 mt-4">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-[13px] font-semibold text-slate-700">국내 판매 브랜드</h2>
            <span className="text-[10.5px] text-slate-400">수입 브랜드 준비중</span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            {BRANDS.map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-extrabold text-[color:var(--color-brand-navy)]">
                  {b.mark}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">
                    {b.name} <span className="text-[10.5px] text-slate-400 font-normal">· {b.country}</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">{b.vibe}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-slate-700">
                    {b.priceBand[0].toLocaleString()}~{b.priceBand[1].toLocaleString()}
                  </div>
                  <div className="text-[9.5px] text-slate-400">{b.models}개 모델</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coach CTA */}
      <section className="px-5 mt-6 mb-4">
        <Link
          to="/coach"
          className="flex items-center justify-between rounded-2xl bg-[color:var(--color-brand-navy)] text-white px-5 py-4 active:scale-[0.99] transition"
        >
          <div>
            <div className="text-[13px] font-semibold">헷갈리면 AI 코치</div>
            <div className="text-[11px] opacity-70 mt-0.5">7문항으로 후보 3대까지</div>
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-80" />
          <ChevronRight className="hidden" />
        </Link>
      </section>
    </ConsumerShell>
  );
}
