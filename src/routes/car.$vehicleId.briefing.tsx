import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { ArrowLeft, Phone, MapPin, MessageSquare, AlertTriangle, Lock } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { findCar, formatKRW, signalLabel } from "@/lib/mock-cars";
import { buildNegotiationBrief } from "@/lib/negotiation-brief";
import { isUnlocked } from "@/lib/report-credits";
import { SampleSize } from "@/components/ui-kit";

export const Route = createFileRoute("/car/$vehicleId/briefing")({
  component: BriefingPage,
  ssr: false,
  beforeLoad: ({ params }) => {
    const car = findCar(params.vehicleId);
    if (!car) throw notFound();
    // 언락 여부는 클라이언트 localStorage — SSR false라 beforeLoad에서도 window 접근 가능
    if (typeof window !== "undefined" && !isUnlocked(params.vehicleId)) {
      throw redirect({
        to: "/car/$vehicleId",
        params: { vehicleId: params.vehicleId },
      });
    }
    return { car };
  },
  loader: ({ params }) => {
    const car = findCar(params.vehicleId);
    if (!car) throw notFound();
    return { car, brief: buildNegotiationBrief(car) };
  },
  head: ({ loaderData }) => {
    const car = loaderData?.car;
    const title = car
      ? `${car.brand} ${car.model} 협상 리포트 · 시그널카`
      : "협상 리포트 · 시그널카";
    return {
      meta: [
        { title },
        { name: "description", content: "실계약 기반 협상 포인트·스크립트·함정 체크." },
        { property: "og:title", content: title },
      ],
    };
  },
  notFoundComponent: () => (
    <ConsumerShell>
      <div className="p-10 text-center text-slate-500">차종을 찾을 수 없어요.</div>
    </ConsumerShell>
  ),
});

const CHANNEL_ICON = {
  phone: Phone,
  visit: MapPin,
  text: MessageSquare,
} as const;

const CHANNEL_LABEL = {
  phone: "전화",
  visit: "현장",
  text: "문자",
} as const;

function BriefingPage() {
  const { car, brief } = Route.useLoaderData();

  return (
    <ConsumerShell>
      <div className="px-5 pt-5 pb-2">
        <Link
          to="/car/$vehicleId"
          params={{ vehicleId: car.id }}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 차량 상세
        </Link>
      </div>

      <section className="px-5 pt-2 pb-5">
        <p className="text-[11px] font-semibold text-[color:var(--color-brand-blue)]">
          협상 리포트 · {brief.generatedAt}
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight text-[color:var(--color-brand-navy)] tracking-tight">
          {car.brand} {car.model}
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {car.trim} · 시그널 {signalLabel(car.signal)}
        </p>
        <div className="mt-3">
          <SampleSize count={brief.sampleSize} />
        </div>
      </section>

      {/* Price band */}
      <section className="px-5 pb-5">
        <div className="rounded-2xl border border-[color:var(--color-brand-mist)] bg-white p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            실거래 밴드
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <PriceCell label="최저" value={formatKRW(brief.min)} />
            <PriceCell label="중앙값" value={formatKRW(brief.median)} emph />
            <PriceCell label="최고" value={formatKRW(brief.max)} />
          </div>
          <p className="mt-3 text-[12px] text-slate-600 leading-relaxed">
            딜러 재량 예상 폭{" "}
            <span className="font-semibold text-[color:var(--color-brand-navy)]">
              {formatKRW(brief.dealerDiscretionMin)} ~ {formatKRW(brief.dealerDiscretionMax)}
            </span>
          </p>
        </div>
      </section>

      {/* Talk tracks */}
      <section className="px-5 pb-5">
        <h2 className="text-[15px] font-bold text-[color:var(--color-brand-navy)]">핵심 포인트</h2>
        <ul className="mt-3 space-y-2">
          {brief.talkTracks.map((t: string) => (
            <li
              key={t}
              className="rounded-xl bg-[color:var(--color-brand-mist)]/50 px-3.5 py-3 text-[13px] text-slate-700 leading-relaxed"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Regional */}
      <section className="px-5 pb-5">
        <h2 className="text-[15px] font-bold text-[color:var(--color-brand-navy)]">
          지역별 편차 (참고)
        </h2>
        <div className="mt-3 rounded-2xl border border-[color:var(--color-brand-mist)] overflow-hidden">
          {brief.regionalSpread.map((r: any) => (
            <div
              key={r.region}
              className="flex items-start justify-between gap-3 px-3.5 py-3 border-b border-slate-100 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">
                  {r.region}
                </div>
                <div className="text-[11.5px] text-slate-500 mt-0.5">{r.note}</div>
              </div>
              <div
                className={`text-[13px] font-bold tabular-nums shrink-0 ${
                  r.medianDelta < 0
                    ? "text-[color:var(--color-signal-buy)]"
                    : r.medianDelta > 0
                      ? "text-[color:var(--color-signal-wait)]"
                      : "text-slate-500"
                }`}
              >
                {r.medianDelta === 0
                  ? "기준"
                  : r.medianDelta < 0
                    ? `${formatKRW(r.medianDelta)}`
                    : `+${formatKRW(r.medianDelta)}`}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scripts */}
      <section className="px-5 pb-5">
        <h2 className="text-[15px] font-bold text-[color:var(--color-brand-navy)]">
          협상 스크립트 3종
        </h2>
        <div className="mt-3 space-y-3">
          {brief.scripts.map((s: any) => {
            const Icon = CHANNEL_ICON[s.channel as keyof typeof CHANNEL_ICON];
            return (
              <div
                key={s.channel}
                className="rounded-2xl border border-[color:var(--color-brand-mist)] bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[color:var(--color-brand-navy)]/8 grid place-items-center">
                    <Icon className="h-4 w-4 text-[color:var(--color-brand-navy)]" />
                  </div>
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 uppercase">
                      {CHANNEL_LABEL[s.channel as keyof typeof CHANNEL_LABEL]}
                    </div>
                    <div className="text-[13.5px] font-semibold text-[color:var(--color-brand-navy)]">
                      {s.title}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Traps */}
      <section className="px-5 pb-8">
        <h2 className="text-[15px] font-bold text-[color:var(--color-brand-navy)] flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-[color:var(--color-signal-wait)]" />
          견적 함정 체크
        </h2>
        <ul className="mt-3 space-y-2">
          {brief.traps.map((t: string) => (
            <li key={t} className="flex gap-2 text-[12.5px] text-slate-700 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-signal-wait)] shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          참고용 코칭입니다. 최종 계약 조건은 딜러와 이용자 합의에 따릅니다.
        </p>
      </section>
    </ConsumerShell>
  );
}

function PriceCell({
  label,
  value,
  emph,
}: {
  label: string;
  value: string;
  emph?: boolean;
}) {
  return (
    <div className={emph ? "rounded-xl bg-[color:var(--color-brand-navy)] text-white px-2 py-2.5" : "px-2 py-2.5"}>
      <div className={`text-[10px] ${emph ? "text-white/70" : "text-slate-400"}`}>{label}</div>
      <div className={`text-[13px] font-bold tabular-nums mt-0.5 ${emph ? "" : "text-[color:var(--color-brand-navy)]"}`}>
        {value}
      </div>
    </div>
  );
}
