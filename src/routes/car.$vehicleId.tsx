import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, TrendingDown, Sparkles, CalendarClock } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { findCar, formatKRW, signalColor, signalLabel } from "@/lib/mock-cars";

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
          search={{ vehicle: car.id }}
          className="block w-full text-center rounded-2xl bg-[color:var(--color-brand-navy)] text-white py-4 font-semibold text-[15px] shadow-[0_10px_30px_rgba(18,32,58,0.25)] active:scale-[0.99] transition"
        >
          협상 브리핑 받기 →
        </Link>
      </div>
    </ConsumerShell>
  );
}