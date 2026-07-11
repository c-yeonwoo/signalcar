import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getPrefs, setPrefs, type BuyerPrefs } from "@/lib/onboarding-store";

/* 첫 방문자에게 3단계 짧은 취향 인터뷰를 노출.
 * 완료 시 코치 인터뷰가 자동 프리필되고, 홈 상단 카피가 이름을 얻는다. */

type Step = 0 | 1 | 2 | 3 | 4;
const TOTAL_STEPS = 5;

const PURPOSES: { v: BuyerPrefs["purpose"]; label: string; sub: string }[] = [
  { v: "commute", label: "출퇴근 위주", sub: "매일 왕복·주차 편의 우선" },
  { v: "family", label: "가족용", sub: "아이·짐·안전이 최우선" },
  { v: "longhaul", label: "장거리·출장", sub: "고속 편의·연비" },
  { v: "leisure", label: "레저·캠핑", sub: "적재·주말 아웃도어" },
];

const SEATS: { v: BuyerPrefs["seats"]; label: string }[] = [
  { v: "1-2", label: "1~2명" },
  { v: "3-4", label: "3~4명" },
  { v: "5+", label: "5명 이상 / 7인승" },
];

const MILEAGE: { v: BuyerPrefs["mileage"]; label: string; sub: string }[] = [
  { v: "low", label: "적게 타요", sub: "연 1만km 이하" },
  { v: "mid", label: "보통이에요", sub: "연 1~2만km" },
  { v: "high", label: "많이 타요", sub: "연 2만km 이상" },
];

const BUDGET: { v: number; label: string; sub: string }[] = [
  { v: 3000, label: "3천만원 이하", sub: "소형·준중형 위주" },
  { v: 4500, label: "3천~4천5백", sub: "중형 SUV·세단" },
  { v: 6000, label: "4천5백~6천", sub: "상위 트림·프리미엄 진입" },
  { v: 9000, label: "6천만원 이상", sub: "럭셔리·수입 검토" },
];

const TIMING: { v: NonNullable<BuyerPrefs["timing"]>; label: string; sub: string }[] = [
  { v: "now", label: "이번 달 안에", sub: "지금 시그널이 가장 중요" },
  { v: "1-3m", label: "1~3개월 내", sub: "협상 시점 코칭" },
  { v: "3-6m", label: "3~6개월 내", sub: "연식변경·재고 흐름 참고" },
  { v: "browsing", label: "아직 둘러보는 중", sub: "부담 없이 트래킹만" },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [purpose, setPurpose] = useState<BuyerPrefs["purpose"] | null>(null);
  const [seats, setSeats] = useState<BuyerPrefs["seats"] | null>(null);
  const [mileage, setMileage] = useState<BuyerPrefs["mileage"] | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [timing, setTiming] = useState<BuyerPrefs["timing"] | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!getPrefs()) setOpen(true);
  }, []);

  const close = (save: boolean) => {
    if (save && purpose && seats && mileage) {
      setPrefs({
        purpose,
        seats,
        mileage,
        budgetMax: budgetMax ?? undefined,
        timing: timing ?? undefined,
        createdAt: Date.now(),
      });
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className="px-5 pt-5 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 w-6 rounded-full ${i <= step ? "bg-[color:var(--color-brand-blue)]" : "bg-slate-200"}`}
              />
            ))}
          </div>
          <button
            onClick={() => close(false)}
            className="text-slate-400 p-1 -m-1"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-6">
          {step === 0 && (
            <>
              <p className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]">
                시그널카를 시작할게요
              </p>
              <h2 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                이 차, 주로<br />어디에 쓰실 계획이세요?
              </h2>
              <div className="mt-5 space-y-2">
                {PURPOSES.map((o) => (
                  <Option
                    key={o.v}
                    active={purpose === o.v}
                    onClick={() => {
                      setPurpose(o.v);
                      setTimeout(() => setStep(1), 120);
                    }}
                    label={o.label}
                    sub={o.sub}
                  />
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]">
                거의 다 왔어요
              </p>
              <h2 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                평소 몇 명이서<br />자주 타세요?
              </h2>
              <div className="mt-5 space-y-2">
                {SEATS.map((o) => (
                  <Option
                    key={o.v}
                    active={seats === o.v}
                    onClick={() => {
                      setSeats(o.v);
                      setTimeout(() => setStep(2), 120);
                    }}
                    label={o.label}
                  />
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]">
                거의 다 왔어요
              </p>
              <h2 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                1년에 얼마나<br />타실 것 같으세요?
              </h2>
              <div className="mt-5 space-y-2">
                {MILEAGE.map((o) => (
                  <Option
                    key={o.v}
                    active={mileage === o.v}
                    onClick={() => {
                      setMileage(o.v);
                      setTimeout(() => setStep(3), 120);
                    }}
                    label={o.label}
                    sub={o.sub}
                  />
                ))}
              </div>
              <button
                onClick={() => close(false)}
                className="mt-4 w-full text-[12px] text-slate-400"
              >
                나중에 할게요
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]">
                예산을 알려주세요
              </p>
              <h2 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                실구매가 기준,<br />어느 정도 생각하세요?
              </h2>
              <div className="mt-5 space-y-2">
                {BUDGET.map((o) => (
                  <Option
                    key={o.v}
                    active={budgetMax === o.v}
                    onClick={() => {
                      setBudgetMax(o.v);
                      setTimeout(() => setStep(4), 120);
                    }}
                    label={o.label}
                    sub={o.sub}
                  />
                ))}
              </div>
              <button
                onClick={() => setStep(4)}
                className="mt-4 w-full text-[12px] text-slate-400"
              >
                건너뛸게요
              </button>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)]">
                마지막 질문이에요
              </p>
              <h2 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1.5">
                언제쯤<br />구매하실 계획이세요?
              </h2>
              <div className="mt-5 space-y-2">
                {TIMING.map((o) => (
                  <Option
                    key={o.v}
                    active={timing === o.v}
                    onClick={() => {
                      setTiming(o.v);
                      setTimeout(() => close(true), 200);
                    }}
                    label={o.label}
                    sub={o.sub}
                  />
                ))}
              </div>
              <button
                onClick={() => close(true)}
                className="mt-4 w-full text-[12px] text-slate-400"
              >
                건너뛰고 시작할게요
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Option({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition ${
        active
          ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">{label}</div>
      {sub && <div className="text-[11.5px] text-slate-500 mt-0.5">{sub}</div>}
    </button>
  );
}