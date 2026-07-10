import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, Image as ImageIcon } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { MOCK_CARS, formatKRW, signalColor, signalLabel, signalEmoji } from "@/lib/mock-cars";

export const Route = createFileRoute("/")({
  component: HomePage,
  ssr: false,
});

function HomePage() {
  return (
    <ConsumerShell>
      <header className="px-5 pt-8 pb-4">
        <div className="text-[13px] text-slate-500">2026년 7월</div>
        <h1 className="text-[26px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
          안녕하세요 👋<br />
          어떤 차 보고 계세요?
        </h1>
        <button className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm active:scale-[0.98] transition">
          <Plus className="h-3.5 w-3.5" />
          관심 차종 추가
        </button>
      </header>

      <section className="px-5 space-y-3">
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-[15px] font-semibold text-slate-700">관심 차종 3</h2>
          <span className="text-[12px] text-slate-400">지금 살 때 신호</span>
        </div>

        {MOCK_CARS.map((c) => {
          const sig = signalColor(c.signal);
          const sparkColor =
            c.signal === "buy" ? "#16A34A" : c.signal === "wait" ? "#F59E0B" : "#64748B";
          return (
            <Link
              key={c.id}
              to="/car/$vehicleId"
              params={{ vehicleId: c.id }}
              className="block bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(18,32,58,0.04)] border border-slate-100 active:scale-[0.99] transition"
            >
              <div className={`mb-4 h-32 w-full rounded-xl bg-gradient-to-br ${c.imageColor} opacity-90 flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
                <div className="relative flex flex-col items-center text-white/80">
                  <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-[10px] mt-1 font-medium tracking-wide">차량 이미지</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-slate-500">{c.brand} · {c.bodyType}</div>
                  <div className="text-[17px] font-bold text-[color:var(--color-brand-navy)] mt-0.5 truncate">
                    {c.model}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5 truncate">{c.trim}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sig.bg} ${sig.text}`}>
                  <span>{signalEmoji(c.signal)}</span>
                  {signalLabel(c.signal)}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-500">실거래가 중앙값</div>
                  <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-none mt-1">
                    {formatKRW(c.medianContract)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">제보 {c.reports}건 · 6개월</div>
                </div>
                <Sparkline values={c.history} color={sparkColor} width={110} height={44} />
              </div>

              <div className={`mt-4 rounded-xl px-3 py-2.5 text-[12.5px] leading-snug ${sig.bg} ${sig.text}`}>
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
            협상 브리핑이 필요하다면 →
          </Link>
        </div>
      </section>
    </ConsumerShell>
  );
}