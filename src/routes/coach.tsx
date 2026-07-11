import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Copy,
  Sparkles,
  Lock,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Crown,
  Fuel,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { MOCK_CARS, formatKRW, estimateOwnership, MILEAGE_MAP } from "@/lib/mock-cars";
import { PageHeader, TabPills, SampleSize } from "@/components/ui-kit";
import { Share2, TrendingDown, Percent } from "lucide-react";
import { getPrefs } from "@/lib/onboarding-store";
import { ProSignupCard } from "@/components/pro-signup-card";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
  ssr: false,
  validateSearch: z.object({ carId: z.string().optional() }).parse,
});

/* ============ Interview definition ============ */

type OptionTag =
  | "adas"
  | "premium-audio"
  | "sunroof"
  | "leather"
  | "heated-cooled-seat"
  | "captain-chair"
  | "tow-package"
  | "hud"
  | "digital-key"
  | "rear-entertain";

type Answer = string;

type Question = {
  id: string;
  coach: string; // 딜러가 던지듯이 묻는 말
  helper?: string; // 왜 묻는지
  options: {
    label: string;
    value: string;
    picks?: OptionTag[]; // 이 선택이 추천에 미치는 옵션들
  }[];
};

const QUESTIONS: Question[] = [
  {
    id: "purpose",
    coach: "이 차 주로 어디에 쓰실 계획이에요?",
    helper: "쓰임새를 알면 꼭 필요한 옵션이 확 줄어들어요.",
    options: [
      { label: "출퇴근 위주", value: "commute", picks: ["adas", "heated-cooled-seat"] },
      { label: "가족용 (아이 있음)", value: "family", picks: ["captain-chair", "rear-entertain", "adas"] },
      { label: "장거리·출장 잦음", value: "longhaul", picks: ["adas", "hud", "premium-audio"] },
      { label: "레저·캠핑", value: "leisure", picks: ["tow-package", "sunroof"] },
    ],
  },
  {
    id: "seats",
    coach: "평소 몇 명이서 자주 타세요?",
    options: [
      { label: "1~2명", value: "1-2" },
      { label: "3~4명", value: "3-4" },
      { label: "5명 이상 / 7인승 필요", value: "5+", picks: ["captain-chair"] },
    ],
  },
  {
    id: "drive",
    coach: "주 주행 환경은 어떤 쪽이에요?",
    helper: "고속 비중이 크면 ADAS·HUD 체감이 커요.",
    options: [
      { label: "도심 위주", value: "city" },
      { label: "고속 위주", value: "highway", picks: ["adas", "hud"] },
      { label: "반반", value: "mixed", picks: ["adas"] },
    ],
  },
  {
    id: "mileage",
    coach: "1년에 얼마나 타실 것 같으세요?",
    options: [
      { label: "1만km 이하", value: "low" },
      { label: "1~2만km", value: "mid" },
      { label: "2만km 이상", value: "high", picks: ["heated-cooled-seat"] },
    ],
  },
  {
    id: "climate",
    coach: "여름·겨울에 특히 신경 쓰는 편이세요?",
    options: [
      { label: "네, 통풍/열선은 필수", value: "yes", picks: ["heated-cooled-seat"] },
      { label: "기본만 있어도 OK", value: "no" },
    ],
  },
  {
    id: "tech",
    coach: "요즘 신차 기능들, 얼마나 챙기고 싶으세요?",
    helper: "디지털키·프리미엄 사운드처럼 '없어도 되지만 있으면 좋은' 옵션들이에요.",
    options: [
      { label: "기본만", value: "basic" },
      { label: "적당히", value: "some", picks: ["digital-key"] },
      { label: "풀옵션 취향", value: "max", picks: ["digital-key", "premium-audio", "sunroof", "leather"] },
    ],
  },
  {
    id: "priority",
    coach: "예산이 빠듯하다면, 뭘 먼저 포기하실래요?",
    options: [
      { label: "안전·주행보조는 절대 포기 못함", value: "safety", picks: ["adas"] },
      { label: "편의사양이 제일 중요", value: "comfort", picks: ["heated-cooled-seat", "leather"] },
      { label: "가격이 최우선", value: "price" },
    ],
  },
];

/* ============ Option catalog (mock) ============ */

const OPTION_CATALOG: Record<OptionTag, { name: string; price: number; why: string }> = {
  adas: { name: "주행보조 패키지 (ADAS)", price: 1500000, why: "고속·장거리에서 피로도 급감" },
  "premium-audio": { name: "프리미엄 사운드", price: 900000, why: "장거리 이동이 잦으면 체감 큼" },
  sunroof: { name: "파노라마 선루프", price: 1200000, why: "개방감·리세일 가치 상승" },
  leather: { name: "천연가죽 시트", price: 1100000, why: "관리 편의·중고차 시세 유리" },
  "heated-cooled-seat": { name: "통풍·열선 시트", price: 700000, why: "국내 기후에서 사실상 필수" },
  "captain-chair": { name: "2열 캡틴시트 (7인승)", price: 1300000, why: "아이·다인 탑승 편의" },
  "tow-package": { name: "견인 패키지", price: 800000, why: "캠핑·트레일러 사용 필수" },
  hud: { name: "헤드업 디스플레이", price: 600000, why: "고속 주행 시 시선 이탈 감소" },
  "digital-key": { name: "디지털 키", price: 400000, why: "폰으로 시동·공유 편의" },
  "rear-entertain": { name: "2열 편의 패키지", price: 700000, why: "아이 장거리 이동 부담↓" },
};

function CoachPage() {
  const [tab, setTab] = useState<"interview" | "briefing">("interview");

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="AI 구매 코치"
        title={<>차 잘 모르셔도 괜찮아요.<br />몇 가지만 여쭤볼게요</>}
      />
      <div className="px-5">
        <TabPills
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "interview", label: "AI 인터뷰" },
            { id: "briefing", label: (<span>협상 브리핑 <Crown className="inline h-3 w-3 -mt-0.5 ml-0.5" /></span>) },
          ]}
        />
      </div>

      {tab === "interview" ? <Interview /> : <BriefingLocked />}

      <div className="h-6" />
    </ConsumerShell>
  );
}

/* ============ Interview flow ============ */

function Interview() {
  const { carId: seedCarId } = Route.useSearch();
  const [carId, setCarId] = useState<string | null>(seedCarId ?? null);
  const [step, setStep] = useState(seedCarId ? 1 : 0); // 상세에서 넘어오면 질문부터
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [prefilled, setPrefilled] = useState(false);

  // 온보딩 취향으로 관련 질문 사전 채움 (사용자는 언제든 이전 버튼으로 수정 가능)
  useEffect(() => {
    if (prefilled) return;
    const p = getPrefs();
    if (!p) return;
    setAnswers((prev) => ({
      purpose: p.purpose,
      seats: p.seats,
      mileage: p.mileage,
      ...prev,
    }));
    setPrefilled(true);
  }, [prefilled]);

  const car = MOCK_CARS.find((c) => c.id === carId) ?? null;
  const totalSteps = QUESTIONS.length + 1; // +1 for 차 선택
  const showResult = car && step > QUESTIONS.length;

  const picks = useMemo<OptionTag[]>(() => {
    const set = new Set<OptionTag>();
    QUESTIONS.forEach((q) => {
      const a = answers[q.id];
      if (!a) return;
      const opt = q.options.find((o) => o.value === a);
      opt?.picks?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [answers]);

  const optionsTotal = picks.reduce((sum, t) => sum + OPTION_CATALOG[t].price, 0);
  const estimatedList = car ? car.listPrice + optionsTotal : 0;
  const estimatedContractLow = car
    ? Math.round((car.minContract + optionsTotal * 0.95) / 10000) * 10000
    : 0;
  const estimatedContractHigh = car
    ? Math.round((car.medianContract + optionsTotal * 0.98) / 10000) * 10000
    : 0;

  const annualKm = MILEAGE_MAP[answers["mileage"] ?? "mid"]?.km ?? 15000;
  const ownership = car ? estimateOwnership(car, annualKm) : null;

  const restart = () => {
    setCarId(null);
    setStep(0);
    setAnswers({});
  };

  /* --- 차 선택 --- */
  if (step === 0) {
    return (
      <section className="px-5 mt-5 space-y-4">
        <ProgressBar current={0} total={totalSteps} />
        <ChatBubble>어떤 차 견적을 뽑아볼까요?</ChatBubble>
        <div className="space-y-2">
          {MOCK_CARS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCarId(c.id);
                setStep(1);
              }}
              className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3.5 text-left active:scale-[0.99] transition"
            >
              <div className={`h-14 w-20 rounded-lg bg-gradient-to-br ${c.imageColor} shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-500">{c.brand}</div>
                <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                  {c.model}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{c.trim}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  /* --- 결과 --- */
  if (showResult && car) {
    return (
      <section className="px-5 mt-5 space-y-4">
        <ProgressBar current={totalSteps} total={totalSteps} />

        <ChatBubble>
          말씀해주신 걸 종합해봤어요. <b>{car.model}</b>이라면 이 구성을 추천드려요.
        </ChatBubble>

        {/* 견적서 카드 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI 맞춤 견적서 (Draft)
            </div>
            <div className="mt-1 text-[16px] font-bold text-[color:var(--color-brand-navy)]">
              {car.model} · {car.trim}
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            <QuoteRow label="차량 가격" value={formatKRW(car.listPrice)} />
            {picks.length === 0 ? (
              <div className="text-[12px] text-slate-500 py-2">
                지금은 추가 옵션 없이도 충분해 보여요.
              </div>
            ) : (
              picks.map((t) => (
                <div key={t} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-signal-buy)] shrink-0" />
                      {OPTION_CATALOG[t].name}
                    </div>
                    <div className="text-[11.5px] text-slate-500 ml-5 mt-0.5">
                      {OPTION_CATALOG[t].why}
                    </div>
                  </div>
                  <div className="text-[13px] text-slate-700 font-medium shrink-0">
                    +{formatKRW(OPTION_CATALOG[t].price)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 space-y-1.5">
            <div className="flex justify-between text-[12px] text-slate-500">
              <span>정가 합계</span>
              <span>{formatKRW(estimatedList)}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[12px] text-slate-600">예상 실계약가</span>
              <span className="text-[18px] font-bold text-[color:var(--color-brand-navy)]">
                {formatKRW(estimatedContractLow)} ~ {formatKRW(estimatedContractHigh)}
              </span>
            </div>
            <div className="pt-1">
              <SampleSize count={car.reports} />
            </div>
          </div>
        </div>

        {/* 예상 유지비 카드 */}
        {ownership && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <Wrench className="h-3 w-3" /> 예상 월 유지비
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)]">
                  월 {formatKRW(ownership.monthlyTotal)}
                </div>
                <div className="text-[11.5px] text-slate-400">
                  연 {formatKRW(ownership.annualTotal)}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                연 {ownership.annualKm.toLocaleString()}km · {car.fuelEfficiency}km/{ownership.fuel.unit} · {ownership.fuel.label}
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <CostRow
                icon={<Fuel className="h-3.5 w-3.5" />}
                label="예상 기름값"
                sub={`${ownership.fuel.label} ${ownership.fuel.price.toLocaleString()}원/${ownership.fuel.unit} 기준`}
                monthly={ownership.monthlyFuel}
                annual={ownership.annualFuelCost}
                tint="text-[color:var(--color-brand-blue)]"
              />
              <CostRow
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="예상 자동차 보험료"
                sub="30대 · 무사고 · 대인/대물 표준 가정"
                monthly={ownership.monthlyInsurance}
                annual={ownership.annualInsurance}
                tint="text-[color:var(--color-signal-buy)]"
              />
              <CostRow
                icon={<Wrench className="h-3.5 w-3.5" />}
                label="소모품·정비 (평균)"
                sub="엔진오일·타이어·소모품 러프 추정"
                monthly={ownership.monthlyMaintenance}
                annual={ownership.annualMaintenance}
                tint="text-[color:var(--color-signal-wait)]"
              />
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-400 leading-relaxed">
              세금·주차·세차 등 개인 편차가 큰 항목은 제외한 러프 추정치예요. 실제 견적은 보험 다이렉트 견적으로 다시 확인해보세요.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => toast.success("견적서를 마이 탭에 저장했어요")}
            className="rounded-2xl bg-[color:var(--color-brand-blue)] text-white py-3.5 font-semibold text-[14px] shadow-[0_10px_30px_rgba(46,107,255,0.3)] active:scale-[0.99] transition"
          >
            견적서 저장
          </button>
          <button
            onClick={async () => {
              const lines = [
                `[시그널카 견적] ${car.model} ${car.trim}`,
                `차량가 ${formatKRW(car.listPrice)}`,
                picks.length
                  ? `옵션 ${picks.map((t) => OPTION_CATALOG[t].name).join(", ")}`
                  : "옵션 없이 기본형",
                `옵션 합계 ${formatKRW(optionsTotal)}`,
                `희망 실계약가 ${formatKRW(estimatedContractLow)} ~ ${formatKRW(estimatedContractHigh)}`,
                `기준: 최근 6개월 실계약 ${car.reports}건 중앙값 · 이달 프로모션 반영`,
              ].join("\n");
              try {
                await navigator.clipboard.writeText(lines);
                toast.success("딜러 공유용 포맷을 복사했어요");
              } catch {
                toast("복사에 실패했어요");
              }
            }}
            className="rounded-2xl border border-slate-200 bg-white text-slate-700 py-3.5 font-semibold text-[14px] inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
          >
            <Share2 className="h-3.5 w-3.5" /> 매장 공유용 복사
          </button>
        </div>

        {/* Upsell → 협상 브리핑 (얼리버드 이메일 캡처) */}
        <ProSignupCard source="coach-result" carId={car.id} />

        <button
          onClick={restart}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-medium text-slate-600 inline-flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> 다른 차로 다시 해보기
        </button>
      </section>
    );
  }

  /* --- 질문 진행 --- */
  const q = QUESTIONS[step - 1];

  return (
    <section className="px-5 mt-5 space-y-4">
      <ProgressBar current={step} total={totalSteps} />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> 이전
        </button>
        <div className="text-[11px] text-slate-400">
          {car?.model} · {step}/{QUESTIONS.length}
        </div>
      </div>

      <ChatBubble>
        {q.coach}
        {q.helper && (
          <div className="mt-1.5 text-[11.5px] text-slate-500 font-normal">{q.helper}</div>
        )}
      </ChatBubble>

      <div className="space-y-2">
        {q.options.map((o) => {
          const active = answers[q.id] === o.value;
          return (
            <button
              key={o.value}
              onClick={() => {
                setAnswers((a) => ({ ...a, [q.id]: o.value }));
                setTimeout(() => setStep((s) => s + 1), 120);
              }}
              className={`w-full text-left rounded-2xl border p-4 transition ${
                active
                  ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/5"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-[14px] font-medium text-[color:var(--color-brand-navy)]">
                {o.label}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ============ Locked briefing (paid teaser) ============ */

function BriefingLocked() {
  const previewCar = MOCK_CARS[0];
  // 딜러 첫 제시가 예측: 정가 - (정가-중앙값)*0.35 러프 (실제는 서버 모델)
  const predictedFirstAsk = Math.round(
    (previewCar.listPrice - (previewCar.listPrice - previewCar.medianContract) * 0.35) / 10000,
  ) * 10000;
  const targetPrice = previewCar.medianContract - 500000;
  const gap = predictedFirstAsk - targetPrice;

  return (
    <section className="px-5 mt-5 space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-navy)] to-slate-800 text-white p-5">
        <div className="flex items-center gap-1.5 text-[11.5px] opacity-80">
          <Crown className="h-3.5 w-3.5" /> 코치 PRO · 월 9,900원
        </div>
        <div className="text-[18px] font-bold mt-1.5 leading-snug">
          매장 앞에서 떨지 마세요.<br />브리핑 한 장으로 무장하세요
        </div>
        <ul className="mt-3 space-y-1.5 text-[12.5px] opacity-90">
          <li>· 딜러가 처음 부를 예상가 예측</li>
          <li>· 내 견적 기준 협상 스크립트 자동 생성</li>
          <li>· 옵션 → 현금할인 전환 팁</li>
          <li>· 금융 함정(저리 할부·리스) 실질금리 체크</li>
        </ul>
        <button className="mt-4 w-full rounded-full bg-white text-[color:var(--color-brand-navy)] py-3 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> 7일 무료로 열어보기
        </button>
      </div>

      {/* 티저 1 — 딜러 첫 제시가 예측 (오픈) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <TrendingDown className="h-3.5 w-3.5" /> 딜러 첫 제시가 예측 · {previewCar.model} 예시
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 items-end">
          <TeaserCol label="딜러 첫 제시" value={formatKRW(predictedFirstAsk)} tone="wait" />
          <TeaserCol label="내 목표가" value={formatKRW(targetPrice)} tone="buy" />
          <TeaserCol label="협상 여지" value={`−${formatKRW(gap)}`} tone="ink" />
        </div>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          최근 실계약 중앙값과 이달 프로모션을 기준으로 계산한 러프 예측이에요.
          <br />PRO에서는 매장·시기별 시나리오 3가지가 함께 제공돼요.
        </p>
      </div>

      {/* 티저 2 — 실질금리 미니 (오픈 → 상세는 잠금) */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Percent className="h-3.5 w-3.5" /> 저리 할부 실질금리 체크
        </div>
        <p className="text-[13px] text-slate-800 mt-2 leading-relaxed">
          "무이자 60개월"이 진짜인지, 현금할인 대비 실질금리로 뒤집어 보여드려요.
        </p>
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-[12px] text-slate-600 flex items-center justify-between">
          <span>예: 300만원 현금할인 포기 시</span>
          <span className="font-bold text-[color:var(--color-signal-wait)] blur-[3px] select-none">
            연 5.4%
          </span>
        </div>
      </div>

      <ProSignupCard source="coach-briefing-locked" variant="compact" />
    </section>
  );
}

/* ============ Small UI atoms ============ */

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-[12.5px] font-medium transition ${
        active ? "bg-white text-[color:var(--color-brand-navy)] shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full bg-[color:var(--color-brand-blue)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="h-8 w-8 rounded-full bg-[color:var(--color-brand-navy)] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
        AI
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-3 text-[13.5px] leading-relaxed text-slate-700 font-medium">
        {children}
      </div>
    </div>
  );
}

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}

function CostRow({
  icon,
  label,
  sub,
  monthly,
  annual,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  monthly: number;
  annual: number;
  tint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className={`text-[12.5px] font-semibold flex items-center gap-1.5 ${tint}`}>
          {icon}
          <span className="text-slate-800">{label}</span>
        </div>
        {sub && <div className="text-[11px] text-slate-500 mt-0.5 ml-5">{sub}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[14px] font-bold text-[color:var(--color-brand-navy)] leading-none">
          월 {formatKRW(monthly)}
        </div>
        <div className="text-[10.5px] text-slate-400 mt-1">연 {formatKRW(annual)}</div>
      </div>
    </div>
  );
}

function TeaserCol({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "buy" | "wait" | "ink";
}) {
  const color =
    tone === "buy"
      ? "text-[color:var(--color-signal-buy)]"
      : tone === "wait"
        ? "text-[color:var(--color-signal-wait)]"
        : "text-[color:var(--color-brand-navy)]";
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2.5">
      <div className="text-[10.5px] text-slate-500">{label}</div>
      <div className={`text-[13.5px] font-bold mt-1 tabular-nums ${color}`}>{value}</div>
    </div>
  );
}