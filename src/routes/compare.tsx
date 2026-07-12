import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { MOCK_CARS, formatKRW, signalColor } from "@/lib/mock-cars";
import { PageHeader, SignalPill, sampleConfidence, StickyCTA } from "@/components/ui-kit";
import { getCompareList, setCompareList } from "@/lib/compare-store";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  ssr: false,
});

function ComparePage() {
  const [selected, setSelected] = useState<string[]>([]);

  // 초기 하이드레이션: 비교함(로컬스토리지) → 없으면 관심 차종 2대 기본
  useEffect(() => {
    const stored = getCompareList();
    if (stored.length >= 1) setSelected(stored);
    else setSelected(MOCK_CARS.slice(0, 2).map((c) => c.id));
  }, []);

  // 선택 변경 → 비교함 동기화
  useEffect(() => {
    if (selected.length > 0) setCompareList(selected);
  }, [selected]);

  const cars = useMemo(
    () => selected.map((id) => MOCK_CARS.find((c) => c.id === id)!).filter(Boolean),
    [selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const bestMedian = Math.min(...cars.map((c) => c.medianContract));
  const bestPromo = Math.max(...cars.map((c) => c.promoPercentile));
  const bestReports = Math.max(...cars.map((c) => c.reports));
  const bestDiscount = Math.max(...cars.map((c) => (c.listPrice - c.medianContract) / c.listPrice));

  return (
    <ConsumerShell>
      <PageHeader
        backTo="/"
        backLabel="홈"
        eyebrow="Compare"
        title="관심 차종 비교"
        subtitle="최대 3대까지 나란히 보고, 항목별로 어떤 차가 유리한지 확인해요."
      />

      {/* Picker */}
      <section className="px-5 mt-3">
        <div className="flex flex-wrap gap-2">
          {MOCK_CARS.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium border transition ${
                  on
                    ? "bg-[color:var(--color-brand-navy)] text-white border-[color:var(--color-brand-navy)]"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {c.model}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-slate-400 mt-2">선택 {selected.length}/3</div>
      </section>

      {cars.length < 2 ? (
        <div className="px-5 mt-10 text-center text-[13px] text-slate-500">
          비교하려면 2대 이상 선택해주세요.
        </div>
      ) : (
        <>
          {/* Header cards */}
          <section className="px-5 mt-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${cars.length}, minmax(0, 1fr))` }}
            >
              {cars.map((c) => {
                const sparkColor =
                  c.signal === "buy" ? "#16A34A" : c.signal === "wait" ? "#F59E0B" : "#64748B";
                return (
                  <Link
                    key={c.id}
                    to="/car/$vehicleId"
                    params={{ vehicleId: c.id }}
                    className="sc-card p-3 active:scale-[0.99] transition"
                  >
                    <div
                      className="h-20 rounded-xl bg-white border border-slate-100 relative overflow-hidden"
                    >
                      <img
                        src={c.image}
                        alt={c.model}
                        className="absolute inset-0 h-full w-full object-contain scale-110 drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 truncate">{c.brand}</div>
                    <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] truncate leading-tight">
                      {c.model}
                    </div>
                    <div className="mt-1.5">
                      <SignalPill signal={c.signal} size="sm" />
                    </div>
                    <div className="mt-2">
                      <Sparkline values={c.history} color={sparkColor} width={110} height={28} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Comparison rows */}
          <section className="px-5 mt-4 space-y-3">
            <CompareRow label="실거래가 중앙값" hint="낮을수록 유리">
              {cars.map((c) => (
                <Cell
                  key={c.id}
                  value={formatKRW(c.medianContract)}
                  best={c.medianContract === bestMedian}
                />
              ))}
            </CompareRow>

            <CompareRow label="정가 대비 할인율" hint="높을수록 유리">
              {cars.map((c) => {
                const disc = (c.listPrice - c.medianContract) / c.listPrice;
                return (
                  <Cell
                    key={c.id}
                    value={`${Math.round(disc * 100)}%`}
                    sub={`-${formatKRW(c.listPrice - c.medianContract)}`}
                    best={disc === bestDiscount}
                  />
                );
              })}
            </CompareRow>

            <CompareRow label="정가" hint="브랜드 공시가">
              {cars.map((c) => (
                <Cell key={c.id} value={formatKRW(c.listPrice)} />
              ))}
            </CompareRow>

            <CompareRow label="실거래 밴드" hint="최저 ~ 최고">
              {cars.map((c) => (
                <Cell
                  key={c.id}
                  value={formatKRW(c.minContract)}
                  sub={`~ ${formatKRW(c.maxContract)}`}
                />
              ))}
            </CompareRow>

            <CompareRow label="이번 달 프로모션" hint="점수 높을수록 유리">
              {cars.map((c) => (
                <Cell
                  key={c.id}
                  value={`${c.promoPercentile}점`}
                  sub={c.promoThisMonth.label}
                  best={c.promoPercentile === bestPromo}
                />
              ))}
            </CompareRow>

            <CompareRow label="제보 표본" hint="많을수록 신뢰도↑">
              {cars.map((c) => (
                <Cell
                  key={c.id}
                  value={`${c.reports}건`}
                  sub={sampleConfidence(c.reports).label}
                  best={c.reports === bestReports}
                />
              ))}
            </CompareRow>

            <CompareRow label="연식/부분변경" hint="임박 시 재고 할인 기회">
              {cars.map((c) => (
                <Cell
                  key={c.id}
                  value={c.facelift ? c.facelift.month : "계획 없음"}
                  sub={c.facelift?.note}
                />
              ))}
            </CompareRow>

            <CompareRow label="시그널 코칭" hint="지금 판단 요약">
              {cars.map((c) => {
                const sig = signalColor(c.signal);
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg px-2 py-2 text-[11.5px] leading-snug ${sig.bg} ${sig.text}`}
                  >
                    {c.coach}
                  </div>
                );
              })}
            </CompareRow>
          </section>

          <div className="h-6" />

          <StickyCTA>
            <Link
              to="/coach/options"
              className="block w-full text-center bg-[color:var(--color-brand-navy)] text-white py-3 rounded-xl font-semibold text-[13.5px] active:opacity-90 transition"
            >
              AI 코치와 최종 결정하기 →
            </Link>
          </StickyCTA>
        </>
      )}
    </ConsumerShell>
  );
}

function CompareRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className="sc-card p-3.5">
      <div className="flex items-baseline justify-between">
        <div className="text-[12px] font-semibold text-slate-700">{label}</div>
        {hint && <div className="text-[10.5px] text-slate-400">{hint}</div>}
      </div>
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

function Cell({
  value,
  sub,
  best,
}: {
  value: string;
  sub?: string;
  best?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2 py-2 ${
        best
          ? "bg-[color:var(--color-signal-buy-soft)] border border-[color:var(--color-signal-buy)]/30"
          : "bg-slate-50"
      }`}
    >
      <div
        className={`text-[13.5px] font-bold leading-tight ${
          best ? "text-[color:var(--color-signal-buy)]" : "text-[color:var(--color-brand-navy)]"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-slate-500 mt-0.5 truncate">{sub}</div>}
      {best && (
        <div className="mt-1 inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-[color:var(--color-signal-buy)]">
          <Check className="h-2.5 w-2.5" /> BEST
        </div>
      )}
    </div>
  );
}