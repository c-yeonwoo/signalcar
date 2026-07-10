import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Info, ExternalLink, ImageOff } from "lucide-react";
import { useState } from "react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { findCar, formatKRW, signalLabel, BENEFIT_META, REVIEWS_BY_CAR } from "@/lib/mock-cars";
import type { Benefit, ReviewBundle, ReviewItem, Signal } from "@/lib/mock-cars";

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

  return (
    <ConsumerShell>
      {/* Top bar */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <Link to="/" className={`inline-flex items-center gap-1 text-[12px] ${MUTED}`}>
          <ArrowLeft className="h-3.5 w-3.5" /> 홈
        </Link>
        <div className={`text-[10px] font-semibold tracking-[0.2em] uppercase ${INK}`}>
          SignalCar · Detail
        </div>
      </div>

      {/* SECTION 01 · Model header */}
      <section className="px-5 pt-2 pb-6">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-[color:var(--color-brand-blue)]">
          {car.brand}
        </p>
        <h1 className={`${DISPLAY} ${NAVY} text-[36px] leading-[1.02] font-bold mt-1`}>
          {car.model}
        </h1>
        <p className={`${MUTED} text-[13px] mt-1.5`}>
          {car.trim} · {car.bodyType}
        </p>

        <div className="mt-5 flex items-end justify-between border-t border-b border-[color:var(--color-brand-mist)] py-4">
          <div>
            <p className={`text-[9.5px] font-bold tracking-[0.2em] uppercase ${MUTED}`}>
              시장 중앙값
            </p>
            <p className={`${DISPLAY} ${NAVY} text-[26px] font-bold mt-0.5`}>
              {formatKRW(car.medianContract)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[9.5px] font-bold tracking-[0.2em] uppercase ${MUTED}`}>정가</p>
            <p className={`${DISPLAY} text-[15px] font-medium mt-0.5 text-slate-400 line-through`}>
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
      <section className="bg-[color:var(--color-brand-navy)] text-white px-6 py-8">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accent.hex }}
          />
          <span
            className="text-[10px] font-bold tracking-[0.28em] uppercase"
            style={{ color: accent.hex }}
          >
            Signal · {accent.label}
          </span>
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/50">
            Coach Verdict
          </span>
        </div>

        <h2 className={`${DISPLAY} text-[26px] leading-[1.15] font-bold mt-4`}>
          {car.headline}
        </h2>
        <p className="text-[13.5px] leading-relaxed text-white/75 mt-3 font-light italic">
          "{car.coach}"
        </p>

        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">
              6M Price Index
            </span>
            <span className={`${DISPLAY} text-[15px] font-bold`} style={{ color: accent.hex }}>
              {signalLabel(car.signal)}
            </span>
          </div>
          <Sparkline values={car.history} color={accent.hex} width={400} height={44} />
        </div>
      </section>

      {/* SECTION 04 · Price distribution */}
      <section className="bg-white px-6 py-8 border-t border-b border-[color:var(--color-brand-mist)]">
        <div className="flex items-center justify-between">
          <h3 className={`text-[10px] font-bold tracking-[0.22em] uppercase ${NAVY}`}>
            Market Distribution
          </h3>
          <span className={`text-[10px] font-bold tracking-[0.15em] uppercase text-[color:var(--color-brand-blue)]`}>
            {car.reports} Reports
          </span>
        </div>

        <div className="mt-8">
          <div className="relative h-[6px] bg-[color:var(--color-brand-mist)]">
            {/* IQR band */}
            <div className="absolute inset-y-0 left-[18%] right-[18%] bg-slate-300" />
            {/* median marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-4 w-[2px]"
              style={{ backgroundColor: accent.hex }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[9.5px] font-bold tracking-widest uppercase">
            <span className={MUTED}>Min · {formatKRW(car.minContract)}</span>
            <span style={{ color: accent.hex }}>Median · {formatKRW(car.medianContract)}</span>
            <span className={MUTED}>Max · {formatKRW(car.maxContract)}</span>
          </div>
        </div>

        <div className={`mt-6 grid grid-cols-2 gap-4 pt-5 border-t ${HAIRLINE}`}>
          <Metric label="Discount vs List" value={`−${discountPct}%`} sub={`−${formatKRW(savings)}`} />
          <Metric
            label="Promo Strength"
            value={`${car.promoPercentile}`}
            sub={`/ 100 · ${car.promoThisMonth.label}`}
          />
        </div>
      </section>

      {/* SECTION 05 · Benefits */}
      <BenefitsSection benefits={car.benefits} accentHex={accent.hex} />

      {/* SECTION 06 · Reviews */}
      <ReviewsSection bundle={REVIEWS_BY_CAR[car.id]} />

      {/* SECTION 07 · Facelift timeline */}
      <section className="bg-white px-6 py-8 border-t border-[color:var(--color-brand-mist)]">
        <h3 className={`text-[10px] font-bold tracking-[0.22em] uppercase ${NAVY} mb-3`}>
          Model Cycle
        </h3>
        {car.facelift ? (
          <>
            <p className={`${DISPLAY} ${NAVY} text-[18px] font-bold`}>
              {car.facelift.month} · {car.facelift.note}
            </p>
            <p className={`${MUTED} text-[12.5px] leading-relaxed mt-2`}>
              발표 임박 시점의 딜러 재고 정리는 통상 할인 폭이 커집니다.
            </p>
          </>
        ) : (
          <p className={`${MUTED} text-[13px]`}>가까운 시기 변경 계획 없음</p>
        )}
      </section>

      <div className="h-4" />

      {/* Fixed CTA */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-5 z-30">
        <Link
          to="/coach"
          className={`block w-full text-center bg-[color:var(--color-brand-navy)] text-white py-4 font-semibold text-[11px] tracking-[0.28em] uppercase ${DISPLAY} active:opacity-90 transition`}
        >
          Consult with a Coach
        </Link>
      </div>
    </ConsumerShell>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className={`text-[9.5px] font-bold tracking-[0.2em] uppercase ${MUTED}`}>{label}</p>
      <p className={`${DISPLAY} ${NAVY} text-[22px] font-bold mt-1 tabular-nums`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${MUTED} tabular-nums`}>{sub}</p>}
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
    s === "official" ? "Official" : s === "dealer" ? "Dealer" : "Partner";

  return (
    <section className="bg-white border-t border-[color:var(--color-brand-mist)]">
      {/* Header band with big savings */}
      <div className="px-6 py-7 grid grid-cols-3 gap-4 items-end border-b border-[color:var(--color-brand-mist)]">
        <div className="col-span-1">
          <p className={`text-[9.5px] font-bold tracking-[0.2em] uppercase text-[color:var(--color-brand-blue)]`}>
            Max Savings
          </p>
        </div>
        <div className="col-span-2 text-right">
          <p className={`${DISPLAY} ${NAVY} text-[30px] font-bold tabular-nums leading-none`}>
            −{formatKRW(maxTotal)}
          </p>
          <p className={`text-[10.5px] ${MUTED} mt-1.5`}>중복 가능 혜택 + 택1 최대치 합산</p>
        </div>
      </div>

      {/* Category rows */}
      <div>
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = BENEFIT_META[cat as keyof typeof BENEFIT_META];
          return (
            <div key={cat} className={`px-6 py-5 border-b ${HAIRLINE}`}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="flex items-baseline gap-2.5">
                  <span className={`${DISPLAY} text-[10px] font-bold tracking-[0.2em] text-slate-400`}>
                    {meta.code}
                  </span>
                  <span className={`text-[12.5px] font-semibold ${INK}`}>{meta.label}</span>
                </div>
              </div>
              <table className="w-full">
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="align-top">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[13px] font-medium ${NAVY}`}>{b.title}</span>
                          <span
                            className={`text-[9px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 border ${
                              b.source === "official"
                                ? "border-[color:var(--color-brand-navy)] text-[color:var(--color-brand-navy)]"
                                : "border-slate-300 text-slate-500"
                            }`}
                          >
                            {sourceLabel(b.source)}
                          </span>
                          {!b.stackable && (
                            <span className="text-[9px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 border border-slate-300 text-slate-500">
                              Exclusive
                            </span>
                          )}
                        </div>
                        <p className={`text-[11.5px] ${MUTED} mt-1 leading-snug`}>{b.note}</p>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap align-top">
                        {b.amount > 0 ? (
                          <span
                            className={`${DISPLAY} text-[14px] font-bold tabular-nums`}
                            style={{ color: accentHex }}
                          >
                            −{formatKRW(b.amount)}
                          </span>
                        ) : (
                          <span className={`text-[10.5px] font-bold tracking-widest uppercase ${MUTED}`}>
                            Rate
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className={`px-6 py-4 text-[10.5px] ${MUTED} leading-relaxed flex gap-2 bg-[color:var(--color-brand-mist)]/40`}>
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          일부 혜택은 중복 불가·조건부입니다. 딜러가 <b className={NAVY}>패키지로 묶어 크게 보이게</b> 하는 경우가 있으니 각 항목의 근거를 개별 확인하세요.
        </span>
      </div>
    </section>
  );
}

function reviewSourceLabel(src: ReviewItem["source"]) {
  return src === "owner" ? "Owner" : src === "video" ? "Video" : "Press";
}

function ReviewsSection({ bundle }: { bundle?: ReviewBundle }) {
  if (!bundle) return null;
  const { aiSummary, aspects, items } = bundle;

  return (
    <>
      {/* Owner Intelligence · dark editorial band */}
      <section className="bg-[color:var(--color-brand-navy)] text-white px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.28em] uppercase text-white/50">
              Owner Intelligence
            </p>
            <h3 className={`${DISPLAY} text-[22px] font-bold mt-1`}>Aspect Scorecard</h3>
          </div>
          <div className="text-right">
            <p className={`${DISPLAY} text-[32px] font-bold leading-none tabular-nums`}>
              {aiSummary.overall.toFixed(1)}
            </p>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/50 mt-1">
              {aiSummary.sampleSize.toLocaleString()} reviews
            </p>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-white/80 font-light italic border-l border-white/20 pl-4">
          "{aiSummary.tldr}"
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6 pt-5 border-t border-white/10">
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1.5">
              Strengths
            </p>
            <ul className="space-y-1">
              {aiSummary.pros.map((p) => (
                <li key={p} className="text-[11.5px] text-white/85 leading-snug">— {p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.2em] uppercase text-white/50 mb-1.5">
              Trade-offs
            </p>
            <ul className="space-y-1">
              {aiSummary.cons.map((p) => (
                <li key={p} className="text-[11.5px] text-white/85 leading-snug">— {p}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Aspect bars — mono white */}
        <div className="mt-6 pt-5 border-t border-white/10 space-y-3.5">
          {aspects.map((a) => (
            <div key={a.label}>
              <div className="flex justify-between text-[10px] font-bold tracking-[0.15em] uppercase text-white/70 mb-1">
                <span>{a.label}</span>
                <span className="tabular-nums">{Math.round((a.score / 5) * 100)}%</span>
              </div>
              <div className="h-[2px] bg-white/10">
                <div className="h-full bg-white" style={{ width: `${(a.score / 5) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Individual reviews */}
      <section className="bg-white">
        <div className="px-6 pt-7 pb-3 flex items-baseline justify-between border-b border-[color:var(--color-brand-mist)]">
          <h3 className={`text-[10px] font-bold tracking-[0.22em] uppercase ${NAVY}`}>
            Verified Reviews
          </h3>
          <span className={`text-[10px] ${MUTED} tracking-widest uppercase`}>{items.length} entries</span>
        </div>
        <ul>
          {items.map((r) => (
            <li key={r.id} className={`px-6 py-5 border-b ${HAIRLINE}`}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className={`${DISPLAY} text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400`}>
                    {reviewSourceLabel(r.source)}
                  </span>
                  <span className={`text-[12.5px] font-semibold ${NAVY}`}>{r.author}</span>
                  {r.verified && (
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 border border-[color:var(--color-brand-navy)] text-[color:var(--color-brand-navy)]">
                      Verified
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${MUTED} tabular-nums shrink-0`}>{r.date}</span>
              </div>
              <div className={`mt-1 text-[10.5px] ${MUTED} tracking-wider`}>
                <span className={`${DISPLAY} font-bold text-[color:var(--color-brand-ink)]`}>
                  {r.rating.toFixed(1)}
                </span>
                <span className="mx-1.5">/</span>
                <span>5.0</span>
                {r.ownershipMonths ? <span className="ml-2">· {r.ownershipMonths}mo owned</span> : null}
                {r.channel ? <span className="ml-2">· {r.channel}</span> : null}
              </div>
              <p className={`text-[13px] ${INK} mt-2.5 leading-relaxed font-light italic`}>
                "{r.quote}"
              </p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.15em] uppercase ${NAVY} mt-3 hover:opacity-70`}
                >
                  Read Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className={`px-6 py-4 text-[10.5px] ${MUTED} leading-relaxed flex gap-2 bg-[color:var(--color-brand-mist)]/40`}>
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>실오너 리뷰는 시그널카 견적서·계약 제보와 연결된 사용자만 작성 가능합니다.</span>
        </div>
      </section>
    </>
  );
}
