import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { MOCK_CARS, formatKRW } from "@/lib/mock-cars";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
  ssr: false,
});

const REGIONS = ["수도권", "충청", "영남", "호남", "강원/제주"] as const;
const FINANCE = ["일시불", "할부", "리스", "장기렌트"] as const;

function CoachPage() {
  const [carId, setCarId] = useState(MOCK_CARS[0].id);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("수도권");
  const [finance, setFinance] = useState<(typeof FINANCE)[number]>("할부");
  const [ready, setReady] = useState(false);

  const car = MOCK_CARS.find((c) => c.id === carId)!;
  const target = Math.round((car.medianContract - 200000) / 10000) * 10000;
  const dealerFirst = Math.round((car.listPrice - 800000) / 10000) * 10000;

  const script = `안녕하세요, ${car.model} ${car.trim} 견적 문의드립니다.\n최근 실계약가 중앙값이 ${formatKRW(car.medianContract)} 수준으로 알고 있고,\n이번 달 프로모션 강도(${car.promoPercentile}점)를 고려하면 ${formatKRW(target)} 이하로 맞춰주시면 계약 진행하려고 합니다.\n옵션은 필수 구성만 넣어주시고, 현금 할인 우선으로 부탁드립니다.`;

  const copy = async () => {
    await navigator.clipboard.writeText(script);
    toast.success("스크립트를 복사했어요");
  };

  return (
    <ConsumerShell>
      <header className="px-5 pt-8 pb-3">
        <div className="text-[12px] text-slate-500">협상 브리핑</div>
        <h1 className="text-[24px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
          딜러 만나기 전에<br />코치가 무장시켜 드릴게요
        </h1>
      </header>

      {/* Inputs */}
      <section className="px-5 space-y-4">
        <Field label="어떤 차 협상 중이세요?">
          <div className="flex flex-wrap gap-2">
            {MOCK_CARS.map((c) => (
              <Chip key={c.id} active={carId === c.id} onClick={() => { setCarId(c.id); setReady(false); }}>
                {c.model}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="지역">
          <Segment values={REGIONS as unknown as string[]} value={region} onChange={(v) => setRegion(v as (typeof REGIONS)[number])} />
        </Field>
        <Field label="결제 방식">
          <Segment values={FINANCE as unknown as string[]} value={finance} onChange={(v) => setFinance(v as (typeof FINANCE)[number])} />
        </Field>

        <button
          onClick={() => setReady(true)}
          className="w-full rounded-2xl bg-[color:var(--color-brand-blue)] text-white py-4 font-semibold text-[15px] shadow-[0_10px_30px_rgba(46,107,255,0.3)] active:scale-[0.99] transition"
        >
          코치 브리핑 받기
        </button>
      </section>

      {ready && (
        <section className="px-5 mt-6 space-y-3">
          <ChatBubble from="coach">
            <b>{car.model}</b> · {region} · {finance} 기준으로 정리해봤어요.
          </ChatBubble>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-[12px] text-slate-500">적정가 밴드</div>
            <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)] mt-1">
              {formatKRW(car.minContract)} ~ {formatKRW(car.medianContract)}
            </div>
            <div className="text-[12px] text-slate-500 mt-1">이 밴드 안에서 계약하면 상위 30%예요.</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-[12px] text-slate-500">딜러가 처음 부를 예상가</div>
            <div className="text-[20px] font-bold text-[color:var(--color-brand-navy)] mt-1">
              약 {formatKRW(dealerFirst)}
            </div>
            <div className="text-[12.5px] text-slate-600 mt-1">
              정가에서 80만원 정도만 빠진 수준으로 시작할 확률이 높아요. 여기서 <b>{formatKRW(dealerFirst - car.medianContract)}</b> 이상 더 깎아야 평균에 도달합니다.
            </div>
          </div>

          <div className="bg-[color:var(--color-brand-navy)] text-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[12px] opacity-80">
              <Sparkles className="h-3.5 w-3.5" /> 이렇게 받아치세요
            </div>
            <p className="text-[13.5px] leading-relaxed mt-2 whitespace-pre-line opacity-95">
              {script}
            </p>
            <button
              onClick={copy}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-2 text-[12px] font-medium"
            >
              <Copy className="h-3.5 w-3.5" /> 스크립트 복사
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">옵션 → 현금할인 전환 팁</div>
            <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate-600">
              <li>• "옵션 서비스는 필요없고, 현금할인으로 돌려주세요" 라고 정확히 말하세요.</li>
              <li>• 딜러 마진 항목(운반비, 등록대행)은 반드시 견적서에서 분리 요청.</li>
              <li>• 사은품(블박·매트) 대신 부품 크레딧으로 받는 게 회수 가능성이 높아요.</li>
            </ul>
          </div>

          <div className="bg-[color:var(--color-signal-wait-soft)] rounded-2xl p-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[color:var(--color-signal-wait)]">
              <AlertTriangle className="h-4 w-4" /> 금융 함정 체크리스트
            </div>
            <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate-700">
              <li>☐ 저리 할부의 조건(선수금·기간)이 실질금리로 환산했을 때 유리한지</li>
              <li>☐ "특판 리스"에 숨은 잔가·초과주행료</li>
              <li>☐ 프로모션 "택1" 조건 — 저리 할부 vs 현금할인 중 어느 게 실이익 큰지</li>
              <li>☐ 신차 보험 특판이 실제 견적보다 비싸지 않은지</li>
            </ul>
          </div>

          {car.reports < 30 && (
            <div className="rounded-2xl p-4 border border-dashed border-slate-300 text-[12.5px] text-slate-500 flex gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              이 트림은 아직 실계약 표본이 적어요. 브리핑을 참고용으로만 활용해주세요.
            </div>
          )}
        </section>
      )}

      <div className="h-4" />
    </ConsumerShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-slate-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-[12.5px] font-medium border transition ${
        active
          ? "bg-[color:var(--color-brand-navy)] text-white border-[color:var(--color-brand-navy)]"
          : "bg-white text-slate-600 border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Segment({ values, value, onChange }: { values: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-slate-100 rounded-full p-1 gap-1 overflow-x-auto">
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex-1 min-w-[64px] rounded-full py-2 text-[12.5px] font-medium transition whitespace-nowrap ${
            value === v ? "bg-white text-[color:var(--color-brand-navy)] shadow-sm" : "text-slate-500"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function ChatBubble({ from, children }: { from: "coach" | "user"; children: React.ReactNode }) {
  const isCoach = from === "coach";
  return (
    <div className={`flex ${isCoach ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
          isCoach ? "bg-white border border-slate-100 text-slate-700" : "bg-[color:var(--color-brand-blue)] text-white"
        }`}
      >
        {children}
      </div>
    </div>
  );
}