import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, TrendingDown, Sparkles, CalendarClock, Gift, Info, Layers, Star, MessageSquareQuote, PlayCircle, Newspaper, ShieldCheck, ExternalLink, Camera, ImageOff } from "lucide-react";
import { useState } from "react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { findCar, formatKRW, signalColor, signalLabel, BENEFIT_META, REVIEWS_BY_CAR } from "@/lib/mock-cars";
import type { Benefit, ReviewBundle, ReviewItem } from "@/lib/mock-cars";

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
  const sig = signalColor(car.signal);
  const sparkColor =
    car.signal === "buy" ? "#16A34A" : car.signal === "wait" ? "#F59E0B" : "#64748B";
  const savings = car.listPrice - car.medianContract;

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
      <header className="px-5 pt-6 pb-3">
        <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-slate-500">
          <ArrowLeft className="h-4 w-4" /> 홈
        </Link>
      </header>

      {/* Hero verdict */}
      <section className="px-5">
        <div className="text-[12px] text-slate-500">{car.brand} · {car.trim}</div>
        <h1 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] mt-0.5">
          {car.model}
        </h1>

        {/* Gallery */}
        <div className="mt-3 h-52 w-full rounded-2xl bg-white border border-slate-100 relative overflow-hidden">
          {shot.src ? (
            <img
              src={shot.src}
              alt={`${car.model} ${shot.label}`}
              width={1024}
              height={640}
              className="absolute inset-0 h-full w-full object-contain object-center drop-shadow-[0_14px_24px_rgba(0,0,0,0.28)] scale-110"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
              <ImageOff className="h-8 w-8" />
              <div className="text-[12px]">{shot.label} 사진 준비중</div>
            </div>
          )}
          <div className="absolute left-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/60 text-white text-[11px] px-2 py-1 backdrop-blur">
            <Camera className="h-3 w-3" />
            {shot.label} · {activeShot + 1}/{gallery.length}
          </div>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {gallery.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setActiveShot(i)}
              className={`shrink-0 h-16 w-20 rounded-lg border overflow-hidden relative transition ${
                i === activeShot
                  ? "border-[color:var(--color-brand-navy)] ring-2 ring-[color:var(--color-brand-navy)]/20"
                  : "border-slate-200 opacity-80"
              } bg-white`}
            >
              {g.src ? (
                <img
                  src={g.src}
                  alt={g.label}
                  className="absolute inset-0 h-full w-full object-contain scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">
                  {g.label}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className={`mt-4 rounded-3xl p-6 ${sig.bg} relative overflow-hidden`}>
          <div className={`text-[13px] font-semibold ${sig.text}`}>
            {signalLabel(car.signal)} · 신뢰도 높음
          </div>
          <div className={`text-[32px] font-extrabold ${sig.text} leading-tight mt-1`}>
            {car.headline}
          </div>
          <p className={`text-[13.5px] leading-relaxed mt-2 ${sig.text} opacity-90`}>
            {car.coach}
          </p>
          <div className="mt-4">
            <Sparkline values={car.history} color={sparkColor} width={280} height={56} />
            <div className="text-[11px] text-slate-500 mt-1">최근 6개월 실거래가 중앙값 추이</div>
          </div>
        </div>
      </section>

      {/* Price distribution */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="text-[12px] text-slate-500">실거래가 분포 · 제보 {car.reports}건</div>
          <div className="text-[24px] font-bold text-[color:var(--color-brand-navy)] mt-1">
            {formatKRW(car.medianContract)} <span className="text-[13px] text-slate-400 font-medium">중앙값</span>
          </div>

          <div className="mt-4">
            <div className="relative h-2 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-slate-300" />
              <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[color:var(--color-brand-blue)] shadow-[0_0_0_4px_rgba(46,107,255,0.15)]" />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span>최저 {formatKRW(car.minContract)}</span>
              <span>최고 {formatKRW(car.maxContract)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-[12.5px] text-[color:var(--color-signal-buy)]">
            <TrendingDown className="h-4 w-4" />
            정가 대비 <b className="font-semibold">{formatKRW(savings)}</b> 낮음 ({Math.round((savings/car.listPrice)*100)}% 할인)
          </div>
        </div>
      </section>

      {/* Promo */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5" /> 이번 달 공식 프로모션
          </div>
          <div className="text-[17px] font-bold text-[color:var(--color-brand-navy)] mt-1">
            {car.promoThisMonth.label}
          </div>
          <div className="text-[13px] text-slate-600 mt-0.5">{car.promoThisMonth.note}</div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
              <span>프로모션 강도</span>
              <span className={sig.text}>{car.promoPercentile}점 / 100</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  car.signal === "buy"
                    ? "bg-[color:var(--color-signal-buy)]"
                    : car.signal === "wait"
                      ? "bg-[color:var(--color-signal-wait)]"
                      : "bg-slate-400"
                }`}
                style={{ width: `${car.promoPercentile}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">최근 6개월 프로모션 대비 percentile</div>
          </div>
        </div>
      </section>

      {/* All benefits */}
      <BenefitsSection benefits={car.benefits} />

      {/* Reviews */}
      <ReviewsSection bundle={REVIEWS_BY_CAR[car.id]} />

      {/* Facelift timeline */}
      <section className="px-5 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" /> 연식변경/부분변경 타임라인
          </div>
          {car.facelift ? (
            <>
              <div className="text-[17px] font-bold text-[color:var(--color-brand-navy)] mt-1">
                {car.facelift.month} · {car.facelift.note}
              </div>
              <p className="text-[12.5px] text-slate-600 mt-2 leading-relaxed">
                발표 임박 시 딜러 재고 밀어내기로 할인 폭이 커지는 경향이 있어요.
              </p>
            </>
          ) : (
            <div className="text-[13px] text-slate-500 mt-1">가까운 시기 변경 계획 없음</div>
          )}
        </div>
      </section>

      <div className="h-4" />

      {/* Fixed CTA */}
      <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[480px] px-5 z-30">
        <Link
          to="/coach"
          className="block w-full text-center rounded-2xl bg-[color:var(--color-brand-navy)] text-white py-4 font-semibold text-[15px] shadow-[0_10px_30px_rgba(18,32,58,0.25)] active:scale-[0.99] transition"
        >
          협상 브리핑 받기 →
        </Link>
      </div>
    </ConsumerShell>
  );
}

function BenefitsSection({ benefits }: { benefits: Benefit[] }) {
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

  const sourceStyle = (s: Benefit["source"]) =>
    s === "official"
      ? "bg-[color:var(--color-brand-blue)]/10 text-[color:var(--color-brand-blue)]"
      : s === "dealer"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  const sourceLabel = (s: Benefit["source"]) =>
    s === "official" ? "공식" : s === "dealer" ? "딜러 재량" : "외부 제휴";

  return (
    <section className="px-5 mt-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-[color:var(--color-brand-navy)] to-slate-800 text-white">
          <div className="flex items-center gap-1.5 text-[11.5px] opacity-80">
            <Gift className="h-3.5 w-3.5" /> 받을 수 있는 혜택 모두 보기
          </div>
          <div className="text-[13px] mt-1 opacity-80">최대 예상 절감</div>
          <div className="text-[26px] font-extrabold leading-tight">
            {formatKRW(maxTotal)}
          </div>
          <div className="text-[11px] opacity-70 mt-1 flex items-center gap-1">
            <Layers className="h-3 w-3" /> 중복 가능한 혜택 + 택1 중 최대치 조합 기준
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = BENEFIT_META[cat as keyof typeof BENEFIT_META];
            return (
              <div key={cat} className="px-5 py-4">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                  <span className="text-[14px]">{meta.emoji}</span>
                  {meta.label}
                </div>
                <ul className="mt-2.5 space-y-2.5">
                  {items.map((b) => (
                    <li key={b.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-medium text-[color:var(--color-brand-navy)]">
                            {b.title}
                          </span>
                          <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${sourceStyle(b.source)}`}>
                            {sourceLabel(b.source)}
                          </span>
                          {!b.stackable && (
                            <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-rose-100 text-rose-600">
                              택1
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">{b.note}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {b.amount > 0 ? (
                          <div className="text-[13.5px] font-bold text-[color:var(--color-signal-buy)]">
                            −{formatKRW(b.amount)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">금리 혜택</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-500 leading-relaxed flex gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            일부 혜택은 중복 불가·조건부예요. 딜러가 <b>패키지로 묶어 크게 보이게</b> 하는 경우가 있어 각 항목별 근거를 따로 확인하는 게 안전해요.
          </span>
        </div>
      </div>
    </section>
  );
}
function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={i < full ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

function sourceMeta(src: ReviewItem["source"]) {
  if (src === "owner")
    return { label: "실오너", Icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700" };
  if (src === "video")
    return { label: "영상", Icon: PlayCircle, cls: "bg-rose-50 text-rose-600" };
  return { label: "미디어", Icon: Newspaper, cls: "bg-slate-100 text-slate-600" };
}

function ReviewsSection({ bundle }: { bundle?: ReviewBundle }) {
  if (!bundle) return null;
  const { aiSummary, aspects, items } = bundle;

  return (
    <section className="px-5 mt-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* AI 요약 헤더 */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <MessageSquareQuote className="h-3.5 w-3.5" /> 리뷰 · AI 한줄요약
          </div>
          <div className="flex items-end gap-2 mt-1.5">
            <div className="text-[28px] font-extrabold text-[color:var(--color-brand-navy)] leading-none">
              {aiSummary.overall.toFixed(1)}
            </div>
            <div className="pb-1">
              <Stars value={aiSummary.overall} size={14} />
              <div className="text-[11px] text-slate-500 mt-0.5">
                실오너·미디어 리뷰 {aiSummary.sampleSize.toLocaleString()}건 기반
              </div>
            </div>
          </div>
          <p className="text-[13px] text-slate-700 mt-3 leading-relaxed">{aiSummary.tldr}</p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="text-[10.5px] font-semibold text-emerald-700 mb-1">👍 자주 언급된 장점</div>
              <ul className="space-y-0.5">
                {aiSummary.pros.map((p) => (
                  <li key={p} className="text-[11.5px] text-emerald-900 leading-snug">· {p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <div className="text-[10.5px] font-semibold text-rose-700 mb-1">👎 자주 언급된 아쉬움</div>
              <ul className="space-y-0.5">
                {aiSummary.cons.map((p) => (
                  <li key={p} className="text-[11.5px] text-rose-900 leading-snug">· {p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 항목별 점수 */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-[11.5px] font-semibold text-slate-600 mb-2">항목별 점수</div>
          <div className="space-y-2">
            {aspects.map((a) => (
              <div key={a.label} className="flex items-center gap-3">
                <div className="w-20 text-[12px] text-slate-600 shrink-0">{a.label}</div>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--color-brand-blue)]"
                    style={{ width: `${(a.score / 5) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-[12px] font-semibold text-[color:var(--color-brand-navy)]">
                  {a.score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 개별 리뷰 */}
        <ul className="divide-y divide-slate-100">
          {items.map((r) => {
            const meta = sourceMeta(r.source);
            const Icon = meta.Icon;
            return (
              <li key={r.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${meta.cls}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </span>
                    <span className="text-[12px] font-medium text-[color:var(--color-brand-navy)]">
                      {r.author}
                    </span>
                    {r.verified && (
                      <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-[color:var(--color-brand-blue)]/10 text-[color:var(--color-brand-blue)]">
                        시그널카 검증
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-slate-400 shrink-0">{r.date}</div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={r.rating} />
                  {r.ownershipMonths ? (
                    <span className="text-[10.5px] text-slate-500">보유 {r.ownershipMonths}개월</span>
                  ) : null}
                  {r.channel ? (
                    <span className="text-[10.5px] text-slate-500">· {r.channel}</span>
                  ) : null}
                </div>
                <p className="text-[13px] text-slate-700 mt-2 leading-relaxed">"{r.quote}"</p>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] text-[color:var(--color-brand-blue)] mt-2 font-medium"
                  >
                    원문 보기 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-500 leading-relaxed flex gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            실오너 리뷰는 시그널카 견적서·계약 제보와 연결된 사용자만 작성할 수 있어요. 외부 미디어/영상은 링크로 원문을 확인하세요.
          </span>
        </div>
      </div>
    </section>
  );
}
