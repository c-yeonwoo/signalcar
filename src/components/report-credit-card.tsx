import { Link, useNavigate } from "@tanstack/react-router";
import { Lock, Unlock, Ticket, Camera, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getCreditBalance,
  isUnlocked,
  spendCreditToUnlock,
} from "@/lib/report-credits";

/**
 * 차량 상세 하단의 give-to-get 게이트 카드.
 * - 언락됨: 실계약 인사이트 미리보기 + "언락됨" 상태
 * - 열람권 있음: "열람권 1장 사용" CTA (즉시 언락)
 * - 열람권 없음: "계약 공유하고 얻기" CTA (/report 이동)
 */
export function ReportCreditCard({
  carId,
  brand,
  model,
}: {
  carId: string;
  brand: string;
  model: string;
}) {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const sync = () => {
      setBalance(getCreditBalance());
      setUnlocked(isUnlocked(carId));
    };
    sync();
    window.addEventListener("sc:report-credits-change", sync);
    return () => window.removeEventListener("sc:report-credits-change", sync);
  }, [carId]);

  if (!hydrated) return null;

  const handleUse = () => {
    const r = spendCreditToUnlock(carId);
    if (!r.ok) {
      toast.error("열람권이 부족해요. 계약을 공유하면 +1장이 지급돼요.");
      return;
    }
    toast.success(`협상 리포트가 열렸어요 · ${brand} ${model}`);
    void navigate({ to: "/car/$vehicleId/briefing", params: { vehicleId: carId } });
  };

  return (
    <section className="px-5 py-5 border-t border-[color:var(--color-brand-mist)] bg-white">
      <div className="rounded-2xl overflow-hidden border border-[color:var(--color-brand-mist)]">
        {/* Header band */}
        <div className="bg-[color:var(--color-brand-navy)] text-white px-4 py-3.5 flex items-center gap-2">
          {unlocked ? (
            <Unlock className="h-4 w-4 text-[color:var(--color-signal-buy)]" />
          ) : (
            <Lock className="h-4 w-4 text-white/70" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
              협상 리포트
            </div>
            <div className="text-[14px] font-bold leading-tight">
              {unlocked ? "실계약 인사이트 열림" : "실계약 인사이트 · 잠금"}
            </div>
          </div>
          {unlocked && (
            <span className="text-[10.5px] font-bold bg-[color:var(--color-signal-buy)] text-white rounded-full px-2 py-0.5">
              언락됨
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <p className="text-[12.5px] text-slate-600 leading-relaxed">
            실계약 밴드·이번 달 공식 프로모·목표가 스크립트로 “얼마까지 밀지”를 정리해 드려요.
            표본이 얇은 차종은 참고용으로 표시됩니다.
          </p>

          {/* Perk list */}
          <ul className="mt-3 space-y-1.5 text-[12px]">
            <PerkItem text="실계약 중앙값·밴드 + 표본 신뢰도" />
            <PerkItem text="이달 공식 프로모 반영 목표가" />
            <PerkItem text="협상 스크립트 3종 (전화·현장·문자)" />
          </ul>

          {/* CTA */}
          {unlocked ? (
            <Link
              to="/car/$vehicleId/briefing"
              params={{ vehicleId: carId }}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-navy)] text-white py-3 text-[13.5px] font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              협상 리포트 열기
            </Link>
          ) : balance > 0 ? (
            <div className="mt-4 space-y-2">
              <button
                onClick={handleUse}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-navy)] text-white py-3 text-[13.5px] font-semibold active:opacity-90"
              >
                <Ticket className="h-4 w-4" />
                열람권 1장 사용 (보유 {balance}장)
              </button>
              <p className="text-center text-[11px] text-slate-500">
                한 번 열면 계속 볼 수 있어요.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <Link
                to="/report"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-navy)] text-white py-3 text-[13.5px] font-semibold active:opacity-90"
              >
                <Camera className="h-4 w-4" />
                내 계약 1건 공유 → 리포트 열기
              </Link>
              <p className="text-center text-[11px] text-slate-500">
                열람권 <b>+1장</b> 즉시 · 어느 차종 협상 리포트에나 사용 · 시세 표본도 같이 두꺼워져요.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PerkItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-1.5 text-slate-700">
      <span className="mt-1.5 h-1 w-1 rounded-full bg-[color:var(--color-brand-navy)] flex-shrink-0" />
      <span>{text}</span>
    </li>
  );
}