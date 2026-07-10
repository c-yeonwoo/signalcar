import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileImage, CheckCircle2 } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { formatKRW } from "@/lib/mock-cars";

export const Route = createFileRoute("/diagnose")({
  component: DiagnosePage,
  ssr: false,
});

function DiagnosePage() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <ConsumerShell>
      <header className="px-5 pt-8 pb-4">
        <div className="text-[12px] text-slate-500">견적서 진단</div>
        <h1 className="text-[24px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
          받은 견적,<br />좋은 조건인지 봐드릴게요
        </h1>
        <p className="text-[13px] text-slate-500 mt-2">
          견적서 사진을 올리면 실거래 분포와 비교해 상/중/하로 알려줘요.
        </p>
      </header>

      <section className="px-5">
        <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer active:scale-[0.99] transition">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div className="mx-auto w-14 h-14 rounded-full bg-[color:var(--color-brand-blue)]/10 grid place-items-center">
            <Upload className="h-6 w-6 text-[color:var(--color-brand-blue)]" />
          </div>
          <div className="mt-3 text-[14px] font-semibold text-[color:var(--color-brand-navy)]">
            {fileName ? "다른 사진으로 변경" : "견적서 사진 올리기"}
          </div>
          <div className="mt-1 text-[12px] text-slate-500">JPG/PNG · 5MB 이하</div>
          {fileName && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate-600">
              <FileImage className="h-3.5 w-3.5" /> {fileName}
            </div>
          )}
        </label>
      </section>

      {fileName && (
        <section className="px-5 mt-4 space-y-3">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]">
              중간 · 개선 여지 있음
            </span>
            <div className="text-[20px] font-bold text-[color:var(--color-brand-navy)] mt-3">
              실거래 분포의 상위 45%
            </div>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              나쁘진 않지만 평균보다 조금 비싸요. 실거래 중앙값 {formatKRW(36800000)} 대비{" "}
              <b>약 30만원</b> 더 깎을 여지가 있어 보여요.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">이렇게 해보세요</div>
            <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-[color:var(--color-signal-buy)]" /> 사은품(블박·매트) → 현금 30만원 전환 요청</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-[color:var(--color-signal-buy)]" /> 운반비/등록대행 실비 청구인지 확인</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-[color:var(--color-signal-buy)]" /> "저리 할부 vs 현금할인" 두 가지 견적을 모두 받아 비교</li>
            </ul>
          </div>

          <p className="text-[11.5px] text-slate-400 text-center py-2">
            * 실제 OCR·정밀 진단은 다음 스프린트에서 도입돼요. 현재는 데모 결과입니다.
          </p>
        </section>
      )}
    </ConsumerShell>
  );
}