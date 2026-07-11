import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, GitCompare } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { MOCK_CARS, formatKRW } from "@/lib/mock-cars";
import { PageHeader, SectionTitle, SignalPill, CarThumb } from "@/components/ui-kit";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  ssr: false,
});

function HomePage() {
  return (
    <ConsumerShell>
      <div className="px-5 pt-6 flex items-center gap-2">
        <img src={logo} alt="시그널카" width={24} height={24} className="h-6 w-6" />
        <span className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)] tracking-tight">시그널카</span>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">2026.07</span>
      </div>
      <PageHeader
        eyebrow="오늘의 시그널"
        title={<>어떤 차,<br />보고 계세요?</>}
        subtitle="관심 차종의 실거래·프로모션·타이밍을 매일 갱신해드려요."
      />
      <div className="px-5">
        <button className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-[12.5px] font-medium text-slate-600 shadow-sm active:scale-[0.98] transition">
          <Plus className="h-3.5 w-3.5" /> 관심 차종 추가
        </button>
      </div>

      <section className="px-5 mt-5 space-y-3">
        <SectionTitle
          right={
            <Link
              to="/compare"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-brand-blue)]"
            >
              <GitCompare className="h-3 w-3" /> 비교하기
            </Link>
          }
        >
          관심 차종 {MOCK_CARS.length}
        </SectionTitle>

        {MOCK_CARS.map((c) => {
          const sparkColor =
            c.signal === "buy" ? "#16A34A" : c.signal === "wait" ? "#F59E0B" : "#64748B";
          return (
            <Link
              key={c.id}
              to="/car/$vehicleId"
              params={{ vehicleId: c.id }}
              className="block sc-card p-5 active:scale-[0.99] transition"
            >
              <div className="mb-4">
                <CarThumb src={c.image} alt={`${c.model} ${c.trim}`} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-slate-500">{c.brand} · {c.bodyType}</div>
                  <div className="text-[17px] font-bold text-[color:var(--color-brand-navy)] mt-0.5 truncate">
                    {c.model}
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{c.trim}</div>
                </div>
                <SignalPill signal={c.signal} />
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-500">실거래가 중앙값</div>
                  <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-none mt-1 tabular-nums">
                    {formatKRW(c.medianContract)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">제보 {c.reports}건 · 6개월</div>
                </div>
                <Sparkline values={c.history} color={sparkColor} width={110} height={44} />
              </div>

              <div
                className="mt-4 rounded-xl bg-slate-50 pl-3 pr-3 py-2.5 text-[12.5px] leading-snug text-slate-700 border-l-2"
                style={{ borderColor: sparkColor }}
              >
                {c.coach}
              </div>

              <div className="mt-3 flex items-center justify-end text-[12px] text-slate-400">
                자세히 보기 <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}

        <div className="pt-2 pb-4 text-center">
          <Link to="/coach" className="text-[13px] text-[color:var(--color-brand-blue)] font-medium">
            AI 코치와 견적 뽑아보기 →
          </Link>
        </div>
      </section>
    </ConsumerShell>
  );
}