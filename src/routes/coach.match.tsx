import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw, Sparkles, Heart, ArrowRight } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import { CATALOG, catalogHasDetail, FUEL_LABEL, type CatalogEntry, type Fuel } from "@/lib/mock-cars";
import { toggleWatchlist, isWatched } from "@/lib/watchlist-store";
import { toast } from "sonner";

export const Route = createFileRoute("/coach/match")({
  component: MatchCoach,
  ssr: false,
});

type Ans = {
  budget?: "under2500" | "2500-4000" | "4000-6000" | "over6000";
  body?: "sedan" | "suv" | "van" | "any";
  seats?: "1-2" | "3-4" | "5+";
  usage?: "commute" | "family" | "longhaul" | "leisure";
  fuel?: "gasoline" | "hybrid" | "ev" | "any";
  timing?: "now" | "3m" | "6m+";
};

const QUESTIONS: {
  id: keyof Ans;
  coach: string;
  helper?: string;
  options: { label: string; value: string }[];
}[] = [
  {
    id: "budget",
    coach: "실계약가 기준, 예산은 어느 정도 잡고 계세요?",
    helper: "옵션·탁송비까지 다 포함한 실지불 기준으로요.",
    options: [
      { label: "2,500만원 이하", value: "under2500" },
      { label: "2,500 ~ 4,000만원", value: "2500-4000" },
      { label: "4,000 ~ 6,000만원", value: "4000-6000" },
      { label: "6,000만원 이상", value: "over6000" },
    ],
  },
  {
    id: "body",
    coach: "선호하는 차체 스타일이 있으세요?",
    options: [
      { label: "세단", value: "sedan" },
      { label: "SUV", value: "suv" },
      { label: "미니밴 (7~9인)", value: "van" },
      { label: "아직 안 정했어요", value: "any" },
    ],
  },
  {
    id: "seats",
    coach: "평소 몇 명이서 자주 타세요?",
    options: [
      { label: "1~2명", value: "1-2" },
      { label: "3~4명", value: "3-4" },
      { label: "5명 이상", value: "5+" },
    ],
  },
  {
    id: "usage",
    coach: "이 차, 주로 어디에 쓰실 계획이에요?",
    options: [
      { label: "출퇴근 위주", value: "commute" },
      { label: "가족용 (아이 있음)", value: "family" },
      { label: "장거리·출장 잦음", value: "longhaul" },
      { label: "레저·캠핑", value: "leisure" },
    ],
  },
  {
    id: "fuel",
    coach: "연료 타입, 선호가 있으세요?",
    helper: "잘 모르시겠으면 '상관없음' 선택해주세요.",
    options: [
      { label: "가솔린", value: "gasoline" },
      { label: "하이브리드", value: "hybrid" },
      { label: "전기", value: "ev" },
      { label: "상관없음", value: "any" },
    ],
  },
  {
    id: "timing",
    coach: "언제쯤 구매 예정이세요?",
    options: [
      { label: "지금 당장 (1개월 내)", value: "now" },
      { label: "2~3개월 뒤", value: "3m" },
      { label: "6개월 이상 여유", value: "6m+" },
    ],
  },
];

const BUDGET_RANGE: Record<NonNullable<Ans["budget"]>, [number, number]> = {
  under2500: [0, 2500],
  "2500-4000": [2500, 4000],
  "4000-6000": [4000, 6000],
  over6000: [6000, 99999],
};

function scoreCar(c: CatalogEntry, a: Ans): number {
  let s = 0;

  // Budget
  if (a.budget) {
    const [lo, hi] = BUDGET_RANGE[a.budget];
    const mid = (c.priceFrom + c.priceTo) / 2;
    if (mid >= lo && mid <= hi) s += 40;
    else if (c.priceFrom <= hi && c.priceTo >= lo) s += 20;
    else s -= 20;
  }

  // Body
  if (a.body && a.body !== "any") {
    const b = c.bodyType;
    const match =
      (a.body === "sedan" && b.includes("세단")) ||
      (a.body === "suv" && b.includes("SUV")) ||
      (a.body === "van" && b.includes("미니밴"));
    s += match ? 25 : -10;
  }

  // Seats
  if (a.seats === "5+" && (c.bodyType.includes("미니밴") || c.bodyType.includes("대형"))) s += 15;
  if (a.seats === "1-2" && (c.bodyType.includes("소형") || c.bodyType.includes("준중형") || c.bodyType.includes("경형"))) s += 10;

  // Usage
  if (a.usage === "family" && (c.bodyType.includes("SUV") || c.bodyType.includes("미니밴"))) s += 12;
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) s += 12;
  if (a.usage === "commute" && (c.bodyType.includes("세단") || c.bodyType.includes("소형") || c.bodyType.includes("준중형"))) s += 10;
  if (a.usage === "longhaul" && (c.bodyType.includes("세단") || c.bodyType.includes("프리미엄"))) s += 8;

  // Fuel
  if (a.fuel && a.fuel !== "any") {
    if (c.fuels.includes(a.fuel as Fuel)) s += 20;
    else s -= 15;
  }

  // Bonus for hot/discount
  if (c.tag === "hot") s += 4;
  if (c.tag === "discount") s += 3;

  return s;
}

function reasonFor(c: CatalogEntry, a: Ans): string {
  const bits: string[] = [];
  if (a.body && a.body !== "any") bits.push(c.bodyType);
  if (a.fuel && a.fuel !== "any" && c.fuels.includes(a.fuel as Fuel)) bits.push(FUEL_LABEL[a.fuel as Fuel]);
  if (a.usage === "family" && c.bodyType.includes("SUV")) bits.push("가족용에 무난");
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) bits.push("레저 활용도 높음");
  if (c.tag === "discount") bits.push("이달 프로모션 큼");
  if (c.tag === "hot") bits.push("판매 상위권");
  return bits.slice(0, 3).join(" · ") || "예산·용도 종합 매칭";
}

function MatchCoach() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Ans>({});

  const totalSteps = QUESTIONS.length;
  const done = step >= totalSteps;

  const recs = useMemo(() => {
    if (!done) return [];
    return CATALOG
      .map((c) => ({ car: c, score: scoreCar(c, answers) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [done, answers]);

  const restart = () => {
    setStep(0);
    setAnswers({});
  };

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="차종 추천 코치"
        title={<>몇 가지만 여쭤보면<br />맞는 차 3대 추려드려요</>}
      />

      <section className="px-5 mt-5 space-y-4">
        <ProgressBar current={done ? totalSteps : step} total={totalSteps} />

        {!done ? (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 text-[12px] text-slate-500 disabled:opacity-40"
                disabled={step === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> 이전
              </button>
              <div className="text-[11px] text-slate-400">
                {step + 1}/{totalSteps}
              </div>
            </div>

            <QuestionCard
              question={QUESTIONS[step]}
              value={answers[QUESTIONS[step].id]}
              onPick={(v) => {
                setAnswers((a) => ({ ...a, [QUESTIONS[step].id]: v as never }));
                setTimeout(() => setStep((s) => s + 1), 120);
              }}
            />
          </>
        ) : (
          <>
            <ChatBubble>
              답변을 종합해봤어요. 지금 조건에서는 이 3대가 가장 잘 맞아요.
            </ChatBubble>

            <div className="space-y-2.5">
              {recs.map(({ car, score }, i) => (
                <RecCard key={car.id} rank={i + 1} car={car} score={score} reason={reasonFor(car, answers)} />
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-[color:var(--color-brand-blue)] mt-0.5 shrink-0" />
              <p className="text-[12px] text-slate-500 leading-relaxed">
                마음에 드는 차를 골랐다면{" "}
                <Link to="/coach/options" className="text-[color:var(--color-brand-blue)] font-semibold">옵션 코치</Link>
                에서 그 차 기준으로 견적서를 만들어보세요.
              </p>
            </div>

            <button
              onClick={restart}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-medium text-slate-600 inline-flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 처음부터 다시
            </button>
          </>
        )}
      </section>

      <div className="h-6" />
    </ConsumerShell>
  );
}

function QuestionCard({
  question,
  value,
  onPick,
}: {
  question: (typeof QUESTIONS)[number];
  value: string | undefined;
  onPick: (v: string) => void;
}) {
  return (
    <>
      <ChatBubble>
        {question.coach}
        {question.helper && (
          <div className="mt-1.5 text-[11.5px] text-slate-500 font-normal">{question.helper}</div>
        )}
      </ChatBubble>
      <div className="space-y-2">
        {question.options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onPick(o.value)}
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
    </>
  );
}

function RecCard({ rank, car, score, reason }: { rank: number; car: CatalogEntry; score: number; reason: string }) {
  const hasDetail = catalogHasDetail(car.id);
  const [watched, setWatched] = useState(() => isWatched(car.id));

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleWatchlist(car.id);
    setWatched(now);
    toast.success(now ? "관심 차량에 담았어요" : "관심에서 뺐어요");
  };

  const inner = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:scale-[0.99] transition">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-[color:var(--color-brand-navy)] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500">{car.brand} · {car.bodyType}</div>
          <div className="text-[15px] font-bold text-[color:var(--color-brand-navy)] truncate">
            {car.model}
          </div>
          <div className="text-[11.5px] text-slate-500 mt-0.5 tabular-nums">
            {car.priceFrom.toLocaleString()} ~ {car.priceTo.toLocaleString()}만원
          </div>
          <p className="text-[11.5px] text-slate-600 mt-2 leading-relaxed">{reason}</p>
          <div className="mt-2 flex items-center gap-2">
            {hasDetail ? (
              <span className="text-[10.5px] text-[color:var(--color-brand-blue)] font-medium inline-flex items-center gap-0.5">
                상세·시그널 보기 <ArrowRight className="h-3 w-3" />
              </span>
            ) : (
              <span className="text-[10.5px] text-slate-400">카탈로그 정보</span>
            )}
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[10px] text-slate-400 tabular-nums">match {score}</span>
          </div>
        </div>
        <button
          onClick={onHeart}
          className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border ${
            watched ? "bg-[color:var(--color-signal-buy)]/10 border-[color:var(--color-signal-buy)]/30 text-[color:var(--color-signal-buy)]" : "bg-white border-slate-200 text-slate-400"
          }`}
          aria-label="관심 담기"
        >
          <Heart className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
        </button>
      </div>
    </div>
  );

  return hasDetail ? (
    <Link to="/car/$vehicleId" params={{ vehicleId: car.id }} className="block">
      {inner}
    </Link>
  ) : (
    <Link to="/explore" className="block">{inner}</Link>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full bg-[color:var(--color-brand-blue)] transition-all" style={{ width: `${pct}%` }} />
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
