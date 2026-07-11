import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Info, ExternalLink, ImageOff, Star, ThumbsUp, ThumbsDown, GitCompare, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { findCar, formatKRW, signalLabel, BENEFIT_META, REVIEWS_BY_CAR } from "@/lib/mock-cars";
import type { Benefit, ReviewBundle, ReviewItem, Signal } from "@/lib/mock-cars";
import { getCompareList, toggleCompare } from "@/lib/compare-store";
import { SampleSize } from "@/components/ui-kit";

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

  const gallery: { label: string; src?: string }[] = [
    { label: "정면", src: car.image },
    { label: "측면" },
    { label: "후면" },
    { label: "실내" },
    { label: "대시보드" },
    { label: "트렁크" },
  ];
  const [activeShot, setActiveShot] = useState(0);
  const shot = gallery[activeShot];

  const [inCompare, setInCompare] = useState(false);
  useEffect(() => {
    const sync = () => setInCompare(getCompareList().includes(car.id));
    sync();
    window.addEventListener("sc:compare-change", sync);
    return () => window.removeEventListener("sc:compare-change", sync);
  }, [car.id]);

  const handleCompare = () => {
    const { added, list } = toggleCompare(car.id);
    toast.success(added ? `비교함에 담았어요 (${list.length}/3)` : "비교함에서 뺐어요");
  };

  return (
    <ConsumerShell>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <Link to="/" className={`inline-flex items-center gap-1 text-[12px] ${MUTED}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> 홈
        </Link>
        <div className={`text-[11px] font-semibold ${INK}`}>시그널카</div>
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
      </section>

      {/* SECTION 02 · Gallery */}
      <section className="bg-[color:var(--color-brand-mist)] py-1">
        <div className="grid grid-cols-4 grid-rows-2 gap-px [grid-auto-rows:1fr]">
          {gallery.slice(0, 5).map((g, i) => {
            const big = i === 0;
            const isPlusTile = i === 4; // last visible tile becomes the "+more" affordance
            const isActive = i === activeShot;
            return (
              <button
                key={g.label}
                onClick={() => setActiveShot(i)}
                className={`${big ? "col-span-2 row-span-2" : "aspect-square"} bg-white relative group`}
              >
                {g.src ? (
                  <img
                    src={g.src}
                    alt={`${car.model} ${g.label}`}
                    className="absolute inset-0 h-full w-full object-contain p-3 scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-300">
                    <ImageOff className="h-5 w-5" strokeWidth={1.4} />
                    <span className="text-[9.5px] tracking-wider uppercase">{g.label}</span>
                  </div>
                )}
                {big && (
                  <span className={`absolute left-3 bottom-2 text-[9.5px] font-bold tracking-[0.15em] uppercase ${INK}`}>
                    {g.label}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-0 ring-2 ring-inset ring-[color:var(--color-brand-navy)]" />
                )}
                {isPlusTile && (
                  <span className="absolute inset-0 bg-[color:var(--color-brand-navy)]/85 flex flex-col items-center justify-center text-white">
                    <span className={`${DISPLAY} text-lg font-bold`}>+{gallery.length - 4}</span>
                    <span className="text-[9px] tracking-[0.2em] uppercase mt-0.5">More</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-5 py-2 flex items-center justify-between">
          <span className={`text-[10px] tracking-[0.15em] uppercase font-semibold ${MUTED}`}>
            {shot.label}
          </span>
          <span className={`text-[10px] tabular-nums ${MUTED}`}>
            {String(activeShot + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}
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

      {/* SECTION 06 · Reviews */}
      <ReviewsSection bundle={REVIEWS_BY_CAR[car.id]} />

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

      {/* Fixed CTA — 견적 + 비교 */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 z-30">
        <div className="flex gap-2 rounded-2xl bg-white/85 backdrop-blur border border-slate-100 p-2 shadow-[0_10px_30px_rgba(15,27,61,0.18)]">
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
            to="/coach"
            search={{ carId: car.id }}
            className="flex-[1.4] text-center bg-[color:var(--color-brand-navy)] text-white py-3 rounded-xl font-semibold text-[13.5px] active:opacity-90"
          >
            이 차로 견적 →
          </Link>
        </div>
      </div>
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

      {/* Hero: Max savings block */}
      <div className="px-5">
        <div
          className="relative rounded-2xl p-5 overflow-hidden text-white"
          style={{
            background: `linear-gradient(135deg, ${accentHex} 0%, color-mix(in oklab, ${accentHex} 70%, #0f1b3d) 100%)`,
          }}
        >
          <div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20"
            style={{ background: "white" }}
          />
          <p className="text-[11.5px] uppercase tracking-[0.14em] opacity-80">최대 예상 혜택</p>
          <p className={`${DISPLAY} text-[34px] font-extrabold tabular-nums leading-none mt-2`}>
            −{formatKRW(maxTotal)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11.5px] opacity-90">
            <span className="px-2 py-0.5 rounded-full bg-white/15">중복 {formatKRW(stackTotal)}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15">택1 최대 {formatKRW(exclusiveBest)}</span>
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
                <p
                  className="text-[15px] font-bold tabular-nums mt-1"
                  style={{ color: accentHex }}
                >
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
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: accentHex }}>
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
  return src === "owner" ? "실오너" : src === "video" ? "영상" : "미디어";
}

function ReviewsSection({ bundle }: { bundle?: ReviewBundle }) {
  if (!bundle) return null;
  const { aiSummary, aspects, items } = bundle;

  return (
    <>
      {/* Owner summary — soft card */}
      <section className="bg-[color:var(--color-brand-mist)]/50 px-5 py-6 border-t border-[color:var(--color-brand-mist)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={SECTION_TITLE}>실오너 리뷰 요약</h3>
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
                  className="h-full rounded-full bg-[color:var(--color-brand-blue)]"
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
          <span>실오너 리뷰는 시그널카 견적서·계약 제보와 연결된 사용자만 작성 가능합니다.</span>
        </div>
      </section>
    </>
  );
}
