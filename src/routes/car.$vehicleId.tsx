import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Info, ExternalLink, Star, ThumbsUp, ThumbsDown, GitCompare, Check, Heart, ScanLine, Bell, Target, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { findCar, formatKRW, signalLabel, BENEFIT_META, REVIEWS_BY_CAR } from "@/lib/mock-cars";
import type { Benefit, ReviewBundle, ReviewItem, Signal } from "@/lib/mock-cars";
import { getCompareList, toggleCompare } from "@/lib/compare-store";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";
import { SnapshotBadge } from "@/components/snapshot-badge";
import { alertStatus, getAlert } from "@/lib/alerts-store";
import { PriceAlertSheet } from "@/components/price-alert-sheet";
import { getMyReviews } from "@/lib/onboarding-store";
import { SampleSize, StickyCTA } from "@/components/ui-kit";
import { ReportCreditCard } from "@/components/report-credit-card";
import { computeNewVsUsed, VERDICT_LABEL, VERDICT_TONE } from "@/lib/new-vs-used";

/* ============================================================
 *  Editorial Navy design system for the car detail page.
 *  Rules:
 *   - No emojis, no rainbow badges, no gradient blobs.
 *   - One accent color per section (signal color used sparingly).
 *   - Space Grotesk for numerals/headings, DM Sans/Pretendard for body.
 *   - Full-width bands separated by hairline dividers.
 * ============================================================ */

const NAVY = "text-[color:var(--color-brand-navy)]";
const INK = "text-[color:var(--color-brand-ink)]";
const MUTED = "text-slate-500";
const HAIRLINE = "border-[color:var(--color-brand-mist)]";
const DISPLAY = "font-[family-name:var(--font-display)] tracking-tight";
const EYEBROW = "text-[11px] font-semibold text-[color:var(--color-brand-blue)]";
const SECTION_TITLE = "text-[15px] font-bold text-[color:var(--color-brand-navy)]";

function signalAccent(s: Signal) {
  if (s === "buy") return { hex: "#16A34A", label: "BUY" };
  if (s === "wait") return { hex: "#F59E0B", label: "WAIT" };
  return { hex: "#64748B", label: "HOLD" };
}

export const Route = createFileRoute("/car/$vehicleId")({
  component: CarDetailPage,
  ssr: false,
  loader: ({ params }) => {
    const car = findCar(params.vehicleId);
    if (!car) throw notFound();
    return { car };
  },
  head: ({ loaderData, params }) => {
    const car = loaderData?.car;
    const title = car ? `${car.brand} ${car.model} · 지금 사도 될까? · 시그널카` : "차량 상세 · 시그널카";
    const desc = car
      ? `${car.brand} ${car.model} 실거래가·프로모션·가격 히스토리를 시그널카가 신호로 알려드려요.`
      : "실거래가·프로모션 신호로 신차 구매 타이밍을 알려주는 시그널카.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/car/${params.vehicleId}` },
      ],
      links: [{ rel: "canonical", href: `/car/${params.vehicleId}` }],
    };
  },
  notFoundComponent: () => (
    <ConsumerShell>
      <div className="p-10 text-center text-slate-500">차종을 찾을 수 없어요.</div>
    </ConsumerShell>
  ),
});

function CarDetailPage() {
  const { car } = Route.useLoaderData();
  const accent = signalAccent(car.signal);
  const savings = car.listPrice - car.medianContract;
  const discountPct = Math.round((savings / car.listPrice) * 100);

  const [inCompare, setInCompare] = useState(false);
  const [watched, setWatched] = useState(false);
  const [alertPrice, setAlertPrice] = useState<number | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      setInCompare(getCompareList().includes(car.id));
      setWatched(getWatchlist().includes(car.id));
      setAlertPrice(getAlert(car.id)?.targetPrice ?? null);
    };
    sync();
    window.addEventListener("sc:compare-change", sync);
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:alerts-change", sync);
    return () => {
      window.removeEventListener("sc:compare-change", sync);
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:alerts-change", sync);
    };
  }, [car.id]);

  const handleCompare = () => {
    const { added, list } = toggleCompare(car.id);
    toast.success(added ? `비교함에 담았어요 (${list.length}/3)` : "비교함에서 뺐어요");
  };

  const handleWatch = () => {
    const { added } = toggleWatch(car.id, { price: car.medianContract });
    toast.success(added ? "관심 차량에 담았어요" : "관심에서 뺐어요");
  };

  const alertHit = alertPrice ? alertStatus(car.medianContract, alertPrice) : null;

  return (
    <ConsumerShell>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <Link to="/" className={`inline-flex items-center gap-1 text-[12px] ${MUTED}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> 홈
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAlertOpen(true)}
            aria-label="목표가 알림 설정"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition ${
              alertHit?.hit
                ? "bg-[color:var(--color-signal-buy)] text-white"
                : alertPrice
                  ? "bg-[color:var(--color-brand-blue)]/12 text-[color:var(--color-brand-blue)]"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {alertHit?.hit ? <Target className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {alertHit?.hit ? "목표가 도달" : alertPrice ? "알림 켜짐" : "목표가 알림"}
          </button>
          <button
            onClick={handleWatch}
            aria-label={watched ? "관심 차량에서 빼기" : "관심 차량에 담기"}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition ${
              watched
                ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${watched ? "fill-current" : ""}`} />
            {watched ? "관심 담김" : "관심 담기"}
          </button>
        </div>
      </div>

      {/* SECTION 01 · Model header */}
      <section className="px-5 pt-2 pb-5">
        <p className={EYEBROW}>{car.brand}</p>
        <h1 className={`${DISPLAY} ${NAVY} text-[32px] leading-[1.1] font-bold mt-1`}>
          {car.model}
        </h1>
        <p className={`${MUTED} text-[13px] mt-1`}>
          {car.trim} · {car.bodyType}
        </p>

        <div className="mt-4 flex items-end justify-between rounded-2xl bg-[color:var(--color-brand-mist)]/60 px-4 py-3.5">
          <div>
            <p className={`text-[11px] ${MUTED}`}>시장 실거래 중앙값</p>
            <p className={`${DISPLAY} ${NAVY} text-[24px] font-bold mt-0.5 tabular-nums`}>
              {formatKRW(car.medianContract)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[11px] ${MUTED}`}>정가</p>
            <p className={`text-[14px] mt-0.5 text-slate-400 line-through tabular-nums`}>
              {formatKRW(car.listPrice)}
            </p>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <SnapshotBadge carId={car.id} currentPrice={car.medianContract} variant="hero" />
          <Link
            to="/car/$vehicleId/history"
            params={{ vehicleId: car.id }}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]"
          >
            프로모션·가격 히스토리 보기 →
          </Link>
        </div>
      </section>

      {/* SECTION 02 · Hero image */}
      <section className="bg-[color:var(--color-brand-mist)]/50 border-y border-[color:var(--color-brand-mist)]">
        <div className="relative aspect-[16/10] w-full flex items-center justify-center overflow-hidden">
          <img
            src={car.image}
            alt={`${car.brand} ${car.model}`}
            className="max-h-full max-w-full object-contain px-6"
          />
          <span className={`absolute left-4 top-3 text-[9.5px] font-semibold tracking-[0.18em] uppercase ${MUTED}`}>
            {car.brand}
          </span>
          <span className={`absolute right-4 bottom-3 inline-flex items-center gap-1 text-[10px] ${MUTED}`}>
            <Camera className="h-3 w-3" strokeWidth={1.6} /> 공식 이미지
          </span>
        </div>
      </section>

      {/* SECTION 03 · Verdict (navy band) */}
      <section className="bg-[color:var(--color-brand-navy)] text-white px-5 py-6">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accent.hex }}
          />
          <span
            className="text-[11px] font-bold"
            style={{ color: accent.hex }}
          >
            {signalLabel(car.signal)} 시그널
          </span>
          <span className="text-[11px] text-white/50">· 코치 판단</span>
        </div>

        <h2 className={`${DISPLAY} text-[22px] leading-[1.25] font-bold mt-3`}>
          {car.headline}
        </h2>
        <p className="text-[13.5px] leading-relaxed text-white/80 mt-2.5">
          {car.coach}
        </p>

        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[11px] text-white/60">최근 6개월 가격 추이</span>
            <span className="text-[11px] font-semibold" style={{ color: accent.hex }}>
              {signalLabel(car.signal)}
            </span>
          </div>
          <Sparkline values={car.history} color={accent.hex} width={400} height={44} />
        </div>
      </section>

      {/* SECTION 04 · Price distribution */}
      <section className="bg-white px-5 py-6 border-b border-[color:var(--color-brand-mist)]">
        <div className="flex items-center justify-between">
          <h3 className={SECTION_TITLE}>실거래가 분포</h3>
          <SampleSize count={car.reports} />
        </div>

        <div className="mt-6">
          <div className="relative h-[6px] bg-[color:var(--color-brand-mist)]">
            {/* IQR band */}
            <div className="absolute inset-y-0 left-[18%] right-[18%] bg-slate-300" />
            {/* median marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-4 w-[2px]"
              style={{ backgroundColor: accent.hex }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums">
            <span className={MUTED}>최저 {formatKRW(car.minContract)}</span>
            <span className="font-semibold" style={{ color: accent.hex }}>중앙 {formatKRW(car.medianContract)}</span>
            <span className={MUTED}>최고 {formatKRW(car.maxContract)}</span>
          </div>
        </div>

        <div className={`mt-5 grid grid-cols-2 gap-4 pt-4 border-t ${HAIRLINE}`}>
          <Metric label="정가 대비 할인" value={`−${discountPct}%`} sub={`−${formatKRW(savings)}`} />
          <Metric
            label="이달 프로모션"
            value={`${car.promoPercentile}점`}
            sub={car.promoThisMonth.label}
          />
        </div>
      </section>

      {/* SECTION 05 · Benefits */}
      <BenefitsSection benefits={car.benefits} accentHex={accent.hex} />

      {/* SECTION 05.2 · Give-to-get gated report */}
      <ReportCreditCard carId={car.id} brand={car.brand} model={car.model} />

      {/* SECTION 05.5 · Depreciation & used market band */}
      <DepreciationSection
        listPrice={car.listPrice}
        medianContract={car.medianContract}
        bodyType={car.bodyType}
        accentHex={accent.hex}
      />

      {/* SECTION 06 · Reviews */}
      <ReviewsSection bundle={REVIEWS_BY_CAR[car.id]} carId={car.id} />

      {/* SECTION 07 · Facelift timeline */}
      <section className="bg-white px-5 py-6 border-t border-[color:var(--color-brand-mist)]">
        <h3 className={`${SECTION_TITLE} mb-2.5`}>모델 사이클</h3>
        {car.facelift ? (
          <>
            <p className={`${NAVY} text-[15px] font-semibold`}>
              {car.facelift.month} · {car.facelift.note}
            </p>
            <p className={`${MUTED} text-[12.5px] leading-relaxed mt-1.5`}>
              발표 임박 시점의 딜러 재고 정리는 통상 할인 폭이 커집니다.
            </p>
          </>
        ) : (
          <p className={`${MUTED} text-[13px]`}>가까운 시기 변경 계획 없음</p>
        )}
      </section>

      <div className="h-4" />

      {/* Sticky CTA — 견적 + 비교 (공용 StickyCTA 프리미티브) */}
      <StickyCTA
        above={
          <Link
            to="/diagnose"
            className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
          >
            <ScanLine className="h-3 w-3" /> 이 차 견적 함정 체크
          </Link>
        }
      >
        <div className="flex gap-2">
          <button
            onClick={handleCompare}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-semibold transition ${
              inCompare
                ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {inCompare ? <Check className="h-4 w-4" /> : <GitCompare className="h-4 w-4" />}
            {inCompare ? "비교함에 담김" : "비교에 담기"}
          </button>
          <Link
            to="/coach/options"
            search={{ carId: car.id }}
            className="flex-[1.4] text-center bg-[color:var(--color-brand-navy)] text-white py-3 rounded-xl font-semibold text-[13.5px] active:opacity-90"
          >
            이 차로 견적 →
          </Link>
        </div>
      </StickyCTA>
      <PriceAlertSheet car={car} open={alertOpen} onOpenChange={setAlertOpen} />
    </ConsumerShell>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className={`text-[11px] ${MUTED}`}>{label}</p>
      <p className={`${NAVY} text-[20px] font-bold mt-0.5 tabular-nums`}>{value}</p>
      {sub && <p className={`text-[11.5px] mt-0.5 ${MUTED} tabular-nums`}>{sub}</p>}
    </div>
  );
}

/* ---------- Depreciation & used market band ---------- */

function DepreciationSection({
  listPrice,
  medianContract,
  bodyType,
  accentHex,
}: {
  listPrice: number;
  medianContract: number;
  bodyType: string;
  accentHex: string;
}) {
  const nvu = computeNewVsUsed({ newPrice: medianContract, bodyType });
  const { used1y, used3y, band1y, band3y, retention3y, verdict, headline, detail } = nvu;

  // 3구간 앵커를 하나의 스케일 위에 배치
  const scaleMax = medianContract;
  const pct = (v: number) => Math.max(3, Math.min(97, (v / scaleMax) * 100));

  const tone = VERDICT_TONE[verdict];
  const toneVar =
    tone === "buy"
      ? "var(--color-signal-buy)"
      : tone === "wait"
        ? "var(--color-signal-wait)"
        : "var(--color-brand-blue)";
  const toneSoft =
    tone === "buy"
      ? "var(--color-signal-buy-soft)"
      : tone === "wait"
        ? "var(--color-signal-wait-soft)"
        : "var(--color-brand-mist)";

  // 정가 대비 5년 뒤 러프 잔가 (참고용)
  const retention5y = Math.max(0.35, retention3y - 0.15);
  const expected5y = Math.round((listPrice * retention5y) / 100000) * 100000;

  return (
    <section className="bg-white px-5 py-6 border-t border-[color:var(--color-brand-mist)]">
      <div className="flex items-center justify-between">
        <h3 className={SECTION_TITLE}>신차 vs 중고 · 지금 사도 될까?</h3>
        <span className={`text-[10.5px] ${MUTED}`}>참고 시세</span>
      </div>
      <p className={`text-[12px] ${MUTED} mt-1 leading-relaxed`}>
        이 차의 신차 실거래가와 무사고 중고 시세 밴드를 비교해 결정을 도와드려요.
      </p>

      {/* 결정 배너 */}
      <div
        className="mt-4 rounded-2xl p-4 border"
        style={{ backgroundColor: `color-mix(in oklab, ${toneVar} 8%, white)`, borderColor: `color-mix(in oklab, ${toneVar} 25%, transparent)` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wider"
            style={{ backgroundColor: toneSoft, color: toneVar }}
          >
            {VERDICT_LABEL[verdict]}
          </span>
          <span className={`text-[13.5px] font-bold ${NAVY}`}>{headline}</span>
        </div>
        <p className="text-[12.5px] text-slate-700 mt-2 leading-relaxed">{detail}</p>
      </div>

      {/* 3구간 앵커 */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <PriceAnchor label="신차 실거래" value={formatKRW(medianContract)} sub="지금" strong />
        <PriceAnchor
          label="1년 무사고 중고"
          value={formatKRW(used1y)}
          sub={`−${Math.round(((medianContract - used1y) / medianContract) * 100)}%`}
          highlight={verdict === "used1y"}
          highlightHex={toneVar}
        />
        <PriceAnchor
          label="3년 무사고 중고"
          value={formatKRW(used3y)}
          sub={`잔가 ${Math.round(retention3y * 100)}%`}
        />
      </div>

      {/* 시세 밴드 시각화 */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-[11px] ${MUTED}`}>중고 시세 밴드 (1년 · 3년)</span>
          <span className={`text-[11px] font-semibold ${NAVY} tabular-nums`}>
            {formatKRW(band3y[0])} ~ {formatKRW(band1y[1])}
          </span>
        </div>
        <div className="relative h-[8px] bg-[color:var(--color-brand-mist)] rounded-full">
          {/* 3년 밴드 (연한 회색) */}
          <div
            className="absolute inset-y-0 rounded-full bg-slate-300/70"
            style={{ left: `${pct(band3y[0])}%`, right: `${100 - pct(band3y[1])}%` }}
          />
          {/* 1년 밴드 (accent) */}
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: `${pct(band1y[0])}%`,
              right: `${100 - pct(band1y[1])}%`,
              backgroundColor: accentHex,
              opacity: 0.35,
            }}
          />
          {/* 3년 중앙값 마커 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-[2px] bg-slate-500"
            style={{ left: `${pct(used3y)}%` }}
          />
          {/* 1년 중앙값 마커 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-[2px]"
            style={{ left: `${pct(used1y)}%`, backgroundColor: accentHex }}
          />
          {/* 신차 마커 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-[2px]"
            style={{ left: `calc(100% - 1px)`, backgroundColor: "var(--color-brand-navy)" }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] tabular-nums">
          <span className={MUTED}>3년</span>
          <span className={MUTED}>1년</span>
          <span className={NAVY + " font-semibold"}>신차 {formatKRW(medianContract)}</span>
        </div>
      </div>

      {/* 5년 참고 */}
      <div className={`mt-5 grid grid-cols-2 gap-4 pt-4 border-t ${HAIRLINE}`}>
        <Metric
          label="5년 후 러프 잔가"
          value={formatKRW(expected5y)}
          sub={`정가 대비 ${Math.round(retention5y * 100)}%`}
        />
        <Metric
          label="3년 감가액"
          value={`−${formatKRW(medianContract - used3y)}`}
          sub={`중앙 실거래 대비 −${Math.round(((medianContract - used3y) / medianContract) * 100)}%`}
        />
      </div>

      <p className={`text-[10.5px] ${MUTED} mt-3 leading-relaxed`}>
        * 잔가율은 국내 중고 시세 공개 데이터의 최근 밴드를 기반으로 한 추정치입니다. 매물 주행·옵션·색상에 따라 편차가 커요.
      </p>
    </section>
  );
}

function PriceAnchor({
  label, value, sub, strong, highlight, highlightHex,
}: {
  label: string; value: string; sub?: string;
  strong?: boolean; highlight?: boolean; highlightHex?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 ${
        highlight ? "" : "border-[color:var(--color-brand-mist)] bg-white"
      }`}
      style={
        highlight
          ? {
              borderColor: `color-mix(in oklab, ${highlightHex} 40%, transparent)`,
              backgroundColor: `color-mix(in oklab, ${highlightHex} 8%, white)`,
            }
          : undefined
      }
    >
      <p className={`text-[10.5px] ${MUTED} leading-tight`}>{label}</p>
      <p className={`${DISPLAY} ${strong ? NAVY : "text-slate-700"} text-[15px] font-bold mt-1 tabular-nums leading-none`}>
        {value}
      </p>
      {sub && <p className={`text-[10.5px] mt-1 ${MUTED} tabular-nums`}>{sub}</p>}
    </div>
  );
}

function BenefitsSection({ benefits, accentHex }: { benefits: Benefit[]; accentHex: string }) {
  // stackable + 금전 혜택 합산 (중복 가능한 것만)
  const stackTotal = benefits
    .filter((b) => b.stackable && b.amount > 0)
    .reduce((s, b) => s + b.amount, 0);
  // 택1(비스택) 중 최대값
  const exclusiveBest = Math.max(0, ...benefits.filter((b) => !b.stackable).map((b) => b.amount));
  const maxTotal = stackTotal + exclusiveBest;

  // 카테고리별 그룹핑
  const grouped = benefits.reduce<Record<string, Benefit[]>>((acc, b) => {
    (acc[b.category] ||= []).push(b);
    return acc;
  }, {});

  const sourceLabel = (s: Benefit["source"]) =>
    s === "official" ? "공식" : s === "dealer" ? "딜러재량" : "제휴";

  return (
    <section className="bg-white border-t border-[color:var(--color-brand-mist)]">
      <div className="px-5 pt-5 pb-2">
        <h3 className={SECTION_TITLE}>받을 수 있는 혜택</h3>
      </div>

      {/* Hero: Max savings — editorial mist card with signal accent bar */}
      <div className="px-5">
        <div className="relative rounded-2xl border border-[color:var(--color-brand-mist)] bg-[color:var(--color-brand-mist)]/40 p-5 overflow-hidden">
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-[3px]"
            style={{ backgroundColor: accentHex }}
          />
          <p className={`text-[11px] uppercase tracking-[0.14em] ${MUTED}`}>최대 예상 혜택</p>
          <p className={`${DISPLAY} ${NAVY} text-[32px] font-extrabold tabular-nums leading-none mt-2`}>
            −{formatKRW(maxTotal)}
          </p>
          <div className={`mt-3 flex items-center gap-1.5 text-[11px] ${MUTED} tabular-nums`}>
            <span className="px-2 py-0.5 rounded-full bg-white border border-[color:var(--color-brand-mist)]">
              중복 {formatKRW(stackTotal)}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white border border-[color:var(--color-brand-mist)]">
              택1 최대 {formatKRW(exclusiveBest)}
            </span>
          </div>
        </div>
      </div>

      {/* Category blocks grid */}
      <div className="px-5 pt-4 pb-2 grid grid-cols-2 gap-2.5">
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = BENEFIT_META[cat as keyof typeof BENEFIT_META];
          const catTotal = items.reduce((s, b) => s + (b.amount || 0), 0);
          return (
            <div
              key={cat}
              className="rounded-xl border border-[color:var(--color-brand-mist)] bg-white p-3 flex flex-col"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[12px] font-semibold ${INK} leading-tight`}>{meta.label}</span>
                <span className={`text-[10.5px] ${MUTED} tabular-nums`}>{items.length}개</span>
              </div>
              {catTotal > 0 && (
                <p className={`${NAVY} text-[15px] font-bold tabular-nums mt-1`}>
                  −{formatKRW(catTotal)}
                </p>
              )}
              <ul className="mt-2 space-y-1">
                {items.slice(0, 2).map((b) => (
                  <li key={b.id} className={`text-[11px] ${MUTED} leading-snug truncate`}>
                    · {b.title}
                  </li>
                ))}
                {items.length > 2 && (
                  <li className={`text-[10.5px] ${MUTED}`}>외 {items.length - 2}건</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Detail list */}
      <div className="px-5 pt-3">
        <p className={`text-[11px] ${MUTED} mb-2`}>세부 내역</p>
        <div className="rounded-xl border border-[color:var(--color-brand-mist)] divide-y divide-[color:var(--color-brand-mist)] overflow-hidden">
          {Object.entries(grouped).flatMap(([cat, items]) => {
            const meta = BENEFIT_META[cat as keyof typeof BENEFIT_META];
            return items.map((b) => (
              <div key={b.id} className="px-3 py-2.5 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10.5px] ${MUTED}`}>{meta.label}</span>
                    <span className={`text-[13px] font-medium ${NAVY}`}>{b.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        b.source === "official"
                          ? "bg-[color:var(--color-brand-navy)]/8 text-[color:var(--color-brand-navy)]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {sourceLabel(b.source)}
                    </span>
                    {!b.stackable && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        택1
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] ${MUTED} mt-0.5 leading-snug`}>{b.note}</p>
                </div>
                <div className="whitespace-nowrap pt-0.5">
                  {b.amount > 0 ? (
                    <span className={`${NAVY} text-[13px] font-bold tabular-nums`}>
                      −{formatKRW(b.amount)}
                    </span>
                  ) : (
                    <span className={`text-[11px] ${MUTED}`}>금리</span>
                  )}
                </div>
              </div>
            ));
          })}
        </div>
      </div>

      <div className={`mx-5 mt-3 mb-5 rounded-lg px-3 py-2.5 text-[11px] ${MUTED} leading-relaxed flex gap-2 bg-[color:var(--color-brand-mist)]/50`}>
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          일부 혜택은 중복 불가·조건부입니다. 딜러가 <b className={NAVY}>패키지로 묶어 크게 보이게</b> 하는 경우가 있으니 각 항목의 근거를 개별 확인하세요.
        </span>
      </div>
    </section>
  );
}

function reviewSourceLabel(src: ReviewItem["source"]) {
  return src === "owner" ? "실제 구매자" : src === "video" ? "영상" : "미디어";
}

function ReviewsSection({ bundle, carId }: { bundle?: ReviewBundle; carId: string }) {
  const [myItems, setMyItems] = useState<ReviewItem[]>([]);
  useEffect(() => {
    const sync = () => {
      const mine = getMyReviews()
        .filter((r) => r.carId === carId)
        .map<ReviewItem>((r) => ({
          id: `my-${r.id}`,
          source: "owner",
          author: "나",
          rating: r.rating,
          date: new Date(r.createdAt).toISOString().slice(0, 7),
          quote: [r.pros && `👍 ${r.pros}`, r.cons && `👎 ${r.cons}`].filter(Boolean).join("  ·  ") || "리뷰를 남겼어요.",
          verified: true,
        }));
      setMyItems(mine);
    };
    sync();
    window.addEventListener("sc:reviews-change", sync);
    return () => window.removeEventListener("sc:reviews-change", sync);
  }, [carId]);

  if (!bundle) return null;
  const { aiSummary, aspects, items: baseItems } = bundle;
  const items = [...myItems, ...baseItems];

  return (
    <>
      {/* Owner summary — soft card */}
      <section className="bg-[color:var(--color-brand-mist)]/50 px-5 py-6 border-t border-[color:var(--color-brand-mist)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={SECTION_TITLE}>실제 구매자 리뷰 요약</h3>
            <p className={`text-[11.5px] ${MUTED} mt-0.5`}>AI가 정리한 한 줄</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="flex items-center gap-1 justify-end">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={0} />
              <span className={`${NAVY} text-[22px] font-bold leading-none tabular-nums`}>
                {aiSummary.overall.toFixed(1)}
              </span>
            </div>
            <p className={`text-[11px] ${MUTED} mt-1`}>
              리뷰 {aiSummary.sampleSize.toLocaleString()}개
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 border border-[color:var(--color-brand-mist)]">
          <p className={`text-[13.5px] ${INK} leading-relaxed`}>{aiSummary.tldr}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="rounded-xl bg-white p-3 border border-[color:var(--color-brand-mist)]">
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11.5px] font-semibold text-emerald-700">좋아요</span>
            </div>
            <ul className="space-y-1">
              {aiSummary.pros.map((p) => (
                <li key={p} className={`text-[12px] ${INK} leading-snug`}>· {p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-white p-3 border border-[color:var(--color-brand-mist)]">
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsDown className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-[11.5px] font-semibold text-rose-600">아쉬워요</span>
            </div>
            <ul className="space-y-1">
              {aiSummary.cons.map((p) => (
                <li key={p} className={`text-[12px] ${INK} leading-snug`}>· {p}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Aspect bars */}
        <div className="mt-4 rounded-xl bg-white p-4 border border-[color:var(--color-brand-mist)] space-y-2.5">
          {aspects.map((a) => (
            <div key={a.label} className="flex items-center gap-3">
              <span className={`text-[12px] ${INK} w-16 shrink-0`}>{a.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[color:var(--color-brand-mist)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[color:var(--color-brand-navy)]/85"
                  style={{ width: `${(a.score / 5) * 100}%` }}
                />
              </div>
              <span className={`${NAVY} text-[12px] font-semibold tabular-nums w-8 text-right`}>
                {a.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Individual reviews */}
      <section className="bg-white">
        <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
          <h3 className={SECTION_TITLE}>리뷰 {items.length}개</h3>
          <span className={`text-[11.5px] text-[color:var(--color-brand-blue)]`}>최신순</span>
        </div>
        <ul className="px-5 pb-2 space-y-3">
          {items.map((r) => {
            const initial = r.author.trim().charAt(0);
            const badgeTone =
              r.source === "owner"
                ? "bg-emerald-50 text-emerald-700"
                : r.source === "video"
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-100 text-slate-600";
            return (
              <li
                key={r.id}
                className="rounded-2xl bg-white border border-[color:var(--color-brand-mist)] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[color:var(--color-brand-mist)] flex items-center justify-center shrink-0">
                    <span className={`${NAVY} text-[13px] font-bold`}>{initial}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[13px] font-semibold ${NAVY}`}>{r.author}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badgeTone}`}>
                        {reviewSourceLabel(r.source)}
                      </span>
                      {r.verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[color:var(--color-brand-navy)]/8 text-[color:var(--color-brand-navy)]">
                          검증
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 mt-0.5 text-[11px] ${MUTED}`}>
                      <span className="flex items-center gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < Math.round(r.rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
                            strokeWidth={0}
                          />
                        ))}
                      </span>
                      <span className="tabular-nums">{r.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span>{r.date}</span>
                      {r.ownershipMonths ? <span>· {r.ownershipMonths}개월 보유</span> : null}
                      {r.channel ? <span>· {r.channel}</span> : null}
                    </div>
                  </div>
                </div>
                <p className={`text-[13px] ${INK} mt-2.5 leading-relaxed`}>{r.quote}</p>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1 text-[11.5px] ${NAVY} mt-2 hover:opacity-70`}
                  >
                    원문 보기 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        <div className={`px-5 py-3 text-[11.5px] ${MUTED} leading-relaxed flex gap-2 bg-[color:var(--color-brand-mist)]/40`}>
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>실제 구매자 리뷰는 시그널카 견적서·계약 공유와 연결된 사용자만 작성 가능합니다.</span>
        </div>
      </section>
    </>
  );
}
