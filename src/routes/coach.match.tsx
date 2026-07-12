import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  RotateCcw,
  Heart,
  ArrowRight,
  Wallet,
  Car,
  Users,
  Compass,
  Fuel as FuelIcon,
  CalendarClock,
  Crown,
  Trophy,
  Medal,
  Sparkles,
  Check,
} from "lucide-react";
import {
  Coins,
  Banknote,
  CreditCard,
  Truck,
  Bus,
  Shuffle,
  User as UserIcon,
  UsersRound,
  Building2,
  Baby,
  Route as RouteIcon,
  Tent,
  BatteryCharging,
  Zap,
  Flame,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import {
  CATALOG,
  catalogHasDetail,
  FUEL_LABEL,
  type CatalogEntry,
  type Fuel,
} from "@/lib/mock-cars";
import { toggleWatch, getWatchlist } from "@/lib/watchlist-store";
import { SnapshotBadge } from "@/components/snapshot-badge";
import { NewVsUsedBadge } from "@/components/new-vs-used-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/coach/match")({
  component: MatchCoach,
  ssr: false,
});

/* ============ Interview definition ============ */

type Ans = {
  budget?: "under2500" | "2500-4000" | "4000-6000" | "over6000";
  body?: "sedan" | "suv" | "van" | "any";
  seats?: "1-2" | "3-4" | "5+";
  usage?: "commute" | "family" | "longhaul" | "leisure";
  fuel?: "gasoline" | "hybrid" | "ev" | "any";
  timing?: "now" | "3m" | "6m+";
};

type Q = {
  id: keyof Ans;
  topic: string;
  icon: React.ReactNode;
  coach: string;
  helper?: string;
  layout: "list" | "grid";
  options: { label: string; sub?: string; value: string; icon?: React.ReactNode }[];
};

const QUESTIONS: Q[] = [
  {
    id: "budget",
    topic: "예산",
    icon: <Wallet className="h-3.5 w-3.5" />,
    coach: "실지불 예산은 어느 정도세요?",
    helper: "차값 + 옵션 + 탁송비 다 포함한 실계약가 기준으로요.",
    layout: "list",
    options: [
      { label: "2,500만원 이하", sub: "경형·소형 중심", value: "under2500", icon: <Coins className="h-6 w-6" /> },
      { label: "2,500 ~ 4,000만원", sub: "준중형·중형 주력대", value: "2500-4000", icon: <Banknote className="h-6 w-6" /> },
      { label: "4,000 ~ 6,000만원", sub: "중대형·프리미엄 진입", value: "4000-6000", icon: <CreditCard className="h-6 w-6" /> },
      { label: "6,000만원 이상", sub: "프리미엄·플래그십", value: "over6000", icon: <Crown className="h-6 w-6" /> },
    ],
  },
  {
    id: "body",
    topic: "차체",
    icon: <Car className="h-3.5 w-3.5" />,
    coach: "선호하는 차체 스타일이 있으세요?",
    layout: "grid",
    options: [
      { label: "세단", value: "sedan", icon: <Car className="h-7 w-7" /> },
      { label: "SUV", value: "suv", icon: <Truck className="h-7 w-7" /> },
      { label: "미니밴", sub: "7~9인", value: "van", icon: <Bus className="h-7 w-7" /> },
      { label: "상관없음", value: "any", icon: <Shuffle className="h-7 w-7" /> },
    ],
  },
  {
    id: "seats",
    topic: "인원",
    icon: <Users className="h-3.5 w-3.5" />,
    coach: "평소 몇 명이서 자주 타세요?",
    layout: "grid",
    options: [
      { label: "1~2명", value: "1-2", icon: <UserIcon className="h-7 w-7" /> },
      { label: "3~4명", value: "3-4", icon: <Users className="h-7 w-7" /> },
      { label: "5명 이상", value: "5+", icon: <UsersRound className="h-7 w-7" /> },
    ],
  },
  {
    id: "usage",
    topic: "용도",
    icon: <Compass className="h-3.5 w-3.5" />,
    coach: "주로 어디에 쓰실 예정이세요?",
    layout: "list",
    options: [
      { label: "출퇴근 위주", sub: "매일 시내 · 주차 편의 중요", value: "commute", icon: <Building2 className="h-6 w-6" /> },
      { label: "가족용 (아이 있음)", sub: "안전·공간 우선", value: "family", icon: <Baby className="h-6 w-6" /> },
      { label: "장거리·출장 잦음", sub: "고속 주행 · 승차감", value: "longhaul", icon: <RouteIcon className="h-6 w-6" /> },
      { label: "레저·캠핑", sub: "짐 많이 · 험로 여유", value: "leisure", icon: <Tent className="h-6 w-6" /> },
    ],
  },
  {
    id: "fuel",
    topic: "연료",
    icon: <FuelIcon className="h-3.5 w-3.5" />,
    coach: "연료 타입, 선호가 있으세요?",
    helper: "잘 모르시겠으면 '상관없음'을 골라주세요.",
    layout: "grid",
    options: [
      { label: "가솔린", value: "gasoline", icon: <FuelIcon className="h-7 w-7" /> },
      { label: "하이브리드", value: "hybrid", icon: <BatteryCharging className="h-7 w-7" /> },
      { label: "전기", value: "ev", icon: <Zap className="h-7 w-7" /> },
      { label: "상관없음", value: "any", icon: <Shuffle className="h-7 w-7" /> },
    ],
  },
  {
    id: "timing",
    topic: "시기",
    icon: <CalendarClock className="h-3.5 w-3.5" />,
    coach: "구매는 언제쯤 예정이세요?",
    layout: "list",
    options: [
      { label: "지금 당장", sub: "1개월 내 계약", value: "now", icon: <Flame className="h-6 w-6" /> },
      { label: "2~3개월 뒤", sub: "천천히 알아보는 중", value: "3m", icon: <CalendarDays className="h-6 w-6" /> },
      { label: "6개월 이상 여유", sub: "정보 수집 단계", value: "6m+", icon: <BookOpen className="h-6 w-6" /> },
    ],
  },
];

const BUDGET_RANGE: Record<NonNullable<Ans["budget"]>, [number, number]> = {
  under2500: [0, 2500],
  "2500-4000": [2500, 4000],
  "4000-6000": [4000, 6000],
  over6000: [6000, 99999],
};

const MAX_SCORE = 100;

function scoreCar(c: CatalogEntry, a: Ans): number {
  let s = 0;

  if (a.budget) {
    const [lo, hi] = BUDGET_RANGE[a.budget];
    const mid = (c.priceFrom + c.priceTo) / 2;
    if (mid >= lo && mid <= hi) s += 35;
    else if (c.priceFrom <= hi && c.priceTo >= lo) s += 18;
    else s -= 18;
  }

  if (a.body && a.body !== "any") {
    const b = c.bodyType;
    const match =
      (a.body === "sedan" && b.includes("세단")) ||
      (a.body === "suv" && b.includes("SUV")) ||
      (a.body === "van" && b.includes("미니밴"));
    s += match ? 22 : -8;
  }

  if (a.seats === "5+" && (c.bodyType.includes("미니밴") || c.bodyType.includes("대형"))) s += 14;
  if (a.seats === "1-2" && (c.bodyType.includes("소형") || c.bodyType.includes("준중형") || c.bodyType.includes("경형"))) s += 10;

  if (a.usage === "family" && (c.bodyType.includes("SUV") || c.bodyType.includes("미니밴"))) s += 12;
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) s += 12;
  if (a.usage === "commute" && (c.bodyType.includes("세단") || c.bodyType.includes("소형") || c.bodyType.includes("준중형"))) s += 10;
  if (a.usage === "longhaul" && (c.bodyType.includes("세단") || c.bodyType.includes("프리미엄"))) s += 8;

  if (a.fuel && a.fuel !== "any") {
    if (c.fuels.includes(a.fuel as Fuel)) s += 18;
    else s -= 14;
  }

  if (c.tag === "hot") s += 4;
  if (c.tag === "discount") s += 3;

  return s;
}

function normalizedMatch(score: number, topScore: number): number {
  // Map to 60~99 range based on rank/score
  const clamped = Math.max(0, Math.min(MAX_SCORE, score));
  const rel = topScore > 0 ? clamped / Math.max(topScore, 1) : 0;
  return Math.round(60 + rel * 39);
}

function reasonsFor(c: CatalogEntry, a: Ans): string[] {
  const bits: string[] = [];
  if (a.body && a.body !== "any") {
    const match =
      (a.body === "sedan" && c.bodyType.includes("세단")) ||
      (a.body === "suv" && c.bodyType.includes("SUV")) ||
      (a.body === "van" && c.bodyType.includes("미니밴"));
    if (match) bits.push(c.bodyType);
  }
  if (a.fuel && a.fuel !== "any" && c.fuels.includes(a.fuel as Fuel)) {
    bits.push(`${FUEL_LABEL[a.fuel as Fuel]} 옵션`);
  }
  if (a.usage === "family" && (c.bodyType.includes("SUV") || c.bodyType.includes("미니밴"))) bits.push("가족 실용성");
  if (a.usage === "leisure" && c.bodyType.includes("SUV")) bits.push("레저 활용도");
  if (a.usage === "commute" && (c.bodyType.includes("세단") || c.bodyType.includes("준중형"))) bits.push("출퇴근 최적");
  if (a.usage === "longhaul") bits.push("장거리 승차감");
  if (a.seats === "5+" && c.bodyType.includes("미니밴")) bits.push("다인 탑승");
  if (a.budget) {
    const [lo, hi] = BUDGET_RANGE[a.budget];
    const mid = (c.priceFrom + c.priceTo) / 2;
    if (mid >= lo && mid <= hi) bits.push("예산 정합");
  }
  if (c.tag === "discount") bits.push("이달 프로모션 큼");
  if (c.tag === "hot") bits.push("판매 상위권");
  return Array.from(new Set(bits)).slice(0, 4);
}

/* ============ Page ============ */

function MatchCoach() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Ans>({});

  const totalSteps = QUESTIONS.length;
  const done = step >= totalSteps;
  const answered = Object.values(answers).filter(Boolean).length;
  const progress = done ? 100 : Math.round((answered / totalSteps) * 100);

  const recs = useMemo(() => {
    if (!done) return [];
    const scored = CATALOG.map((c) => ({ car: c, raw: scoreCar(c, answers) }))
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 3);
    const top = scored[0]?.raw ?? 0;
    return scored.map(({ car, raw }) => ({
      car,
      raw,
      match: normalizedMatch(raw, top),
      reasons: reasonsFor(car, answers),
    }));
  }, [done, answers]);

  const restart = () => {
    setStep(0);
    setAnswers({});
  };

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="차종 추천 상담"
        title={
          done ? (
            <>답변을 종합해봤어요.<br />이 3대가 잘 맞아요</>
          ) : (
            <>몇 가지만 여쭤보면<br />맞는 차 3대를 추려드려요</>
          )
        }
      />

      {/* Progress bar */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10.5px] font-medium tracking-wider uppercase text-slate-400">
            {done ? "Result" : `Step ${Math.min(step + 1, totalSteps)} / ${totalSteps}`}
          </div>
          <div className="text-[10.5px] tabular-nums text-slate-500 font-semibold">{progress}%</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--color-brand-blue)] to-[#5B8DEF] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Topic chips */}
        <div className="mt-3 flex gap-1 overflow-x-auto no-scrollbar">
          {QUESTIONS.map((q, i) => {
            const answered = !!answers[q.id];
            const active = i === step && !done;
            return (
              <div
                key={q.id}
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition ${
                  active
                    ? "bg-[color:var(--color-brand-navy)] text-white"
                    : answered
                      ? "bg-[color:var(--color-signal-buy)]/12 text-[color:var(--color-signal-buy)]"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {answered && !active ? <Check className="h-3 w-3" /> : q.icon}
                {q.topic}
              </div>
            );
          })}
        </div>
      </div>

      {!done ? (
        <InterviewStep
          step={step}
          totalSteps={totalSteps}
          question={QUESTIONS[step]}
          value={answers[QUESTIONS[step].id]}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onPick={(v) => {
            setAnswers((a) => ({ ...a, [QUESTIONS[step].id]: v as never }));
            setTimeout(() => setStep((s) => s + 1), 140);
          }}
        />
      ) : (
        <ResultView recs={recs} onRestart={restart} />
      )}

      <div className="h-8" />
    </ConsumerShell>
  );
}

/* ============ Interview step ============ */

function InterviewStep({
  step,
  totalSteps,
  question,
  value,
  onBack,
  onPick,
}: {
  step: number;
  totalSteps: number;
  question: Q;
  value: string | undefined;
  onBack: () => void;
  onPick: (v: string) => void;
}) {
  // Simple keyed re-mount for enter animation
  return (
    <section className="px-5 mt-5" key={question.id}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500 disabled:opacity-40"
          disabled={step === 0}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> 이전
        </button>
        <div className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/10 rounded-full px-2 py-0.5">
          {question.icon}
          {question.topic}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ChatBubble>
          {question.coach}
          {question.helper && (
            <div className="mt-1.5 text-[11.5px] text-slate-500 font-normal">{question.helper}</div>
          )}
        </ChatBubble>

        {question.layout === "grid" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {question.options.map((o) => {
              const active = value === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => onPick(o.value)}
                  className={`aspect-[1.15/1] flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 transition active:scale-[0.98] ${
                    active
                      ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/8"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className={`leading-none ${active ? "text-[color:var(--color-brand-blue)]" : "text-[color:var(--color-brand-navy)]"}`}>{o.icon}</div>
                  <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">{o.label}</div>
                  {o.sub && <div className="text-[10.5px] text-slate-500">{o.sub}</div>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {question.options.map((o) => {
              const active = value === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => onPick(o.value)}
                  className={`w-full flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition active:scale-[0.99] ${
                    active
                      ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/8"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? "bg-white text-[color:var(--color-brand-blue)]" : "bg-slate-50 text-[color:var(--color-brand-navy)]"
                  }`}>
                    {o.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">{o.label}</div>
                    {o.sub && <div className="text-[11.5px] text-slate-500 mt-0.5">{o.sub}</div>}
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]" : "border-slate-300 bg-white"
                  }`}>
                    {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-[10.5px] text-slate-400">
        {step + 1} / {totalSteps} · 답변은 언제든 뒤로 돌아가 수정할 수 있어요
      </div>
    </section>
  );
}

/* ============ Result view ============ */

type Rec = {
  car: CatalogEntry;
  raw: number;
  match: number;
  reasons: string[];
};

function ResultView({ recs, onRestart }: { recs: Rec[]; onRestart: () => void }) {
  const [pop, setPop] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPop(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (recs.length === 0) return null;

  const [first, second, third] = recs;

  return (
    <section className="px-5 mt-5 space-y-4">
      {/* Summary strip */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-blue)]" />
          매치 점수 비교
        </div>
        <div className="mt-3 space-y-2.5">
          {recs.map((r, i) => (
            <div key={r.car.id} className="flex items-center gap-2">
              <div className="text-[10.5px] font-bold text-slate-400 w-4 tabular-nums">#{i + 1}</div>
              <div className="text-[12px] text-slate-700 font-medium w-24 truncate">{r.car.model}</div>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    i === 0
                      ? "bg-gradient-to-r from-[color:var(--color-brand-blue)] to-[#6BA1FF]"
                      : "bg-slate-300"
                  }`}
                  style={{ width: pop ? `${r.match}%` : "0%" }}
                />
              </div>
              <div className="text-[11.5px] font-bold tabular-nums text-[color:var(--color-brand-navy)] w-10 text-right">
                {r.match}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero — #1 */}
      <HeroCard rec={first} pop={pop} />

      {/* Runner-ups */}
      {second && <RunnerUp rec={second} rank={2} pop={pop} />}
      {third && <RunnerUp rec={third} rank={3} pop={pop} />}

      {/* CTA to options coach */}
      <Link
        to="/coach/options"
        className="mt-2 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-navy)] to-slate-700 text-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.16)] active:scale-[0.99] transition"
      >
        <div>
          <div className="text-[11px] opacity-80">다음 단계</div>
          <div className="text-[14px] font-bold mt-0.5">고른 차로 옵션·견적서 만들기</div>
        </div>
        <div className="rounded-full bg-white/15 p-2">
          <ArrowRight className="h-4 w-4" />
        </div>
      </Link>

      <button
        onClick={onRestart}
        className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-medium text-slate-600 inline-flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 처음부터 다시
      </button>
    </section>
  );
}

/* ============ Result cards ============ */

function HeroCard({ rec, pop }: { rec: Rec; pop: boolean }) {
  const { car, match, reasons } = rec;
  const hasDetail = catalogHasDetail(car.id);
  const [watched, setWatched] = useState(() => getWatchlist().includes(car.id));

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(car.id, { price: car.priceFrom });
    setWatched(added);
    toast.success(added ? "관심 차량에 담았어요" : "관심에서 뺐어요");
  };

  const inner = (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[color:var(--color-brand-navy)] via-[#152449] to-[#1e3a5f] text-white p-5 shadow-[0_24px_60px_rgba(15,27,61,0.25)] active:scale-[0.995] transition">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[color:var(--color-brand-blue)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-[#6BA1FF]/12 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur px-2.5 py-1 text-[10.5px] font-bold tracking-wider">
          <Crown className="h-3 w-3 text-yellow-300" />
          BEST MATCH
        </div>
        <button
          onClick={onHeart}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
            watched ? "bg-white text-[color:var(--color-signal-buy)]" : "bg-white/12 text-white"
          }`}
          aria-label="관심 담기"
        >
          <Heart className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="relative mt-3 flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] opacity-70">{car.brand} · {car.bodyType}</div>
          <div className="text-[26px] font-black leading-tight mt-0.5">{car.model}</div>
          <div className="text-[12px] opacity-80 mt-1.5 tabular-nums">
            {car.priceFrom.toLocaleString()} ~ {car.priceTo.toLocaleString()}만원
          </div>
          <div className="mt-2">
            <SnapshotBadge carId={car.id} currentPrice={car.priceFrom * 10000} variant="inline" />
          </div>
        </div>
        <MatchRing value={match} pop={pop} />
      </div>

      {/* Reason chips */}
      {reasons.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          {reasons.map((r) => (
            <span
              key={r}
              className="rounded-full bg-white/12 backdrop-blur border border-white/10 px-2.5 py-1 text-[11px] font-medium"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Fuel row */}
      <div className="relative mt-4 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 opacity-85">
          <FuelIcon className="h-3 w-3" />
          {car.fuels.map((f) => FUEL_LABEL[f]).join(" · ")}
        </div>
        <div className="inline-flex items-center gap-1 text-white/95 font-semibold">
          {hasDetail ? "상세·시그널 보기" : "전체 차량 열기"}
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
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

function RunnerUp({ rec, rank, pop }: { rec: Rec; rank: number; pop: boolean }) {
  const { car, match, reasons } = rec;
  const hasDetail = catalogHasDetail(car.id);
  const [watched, setWatched] = useState(() => getWatchlist().includes(car.id));

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(car.id, { price: car.priceFrom });
    setWatched(added);
    toast.success(added ? "관심 차량에 담았어요" : "관심에서 뺐어요");
  };

  const RankIcon = rank === 2 ? Trophy : Medal;
  const rankColor = rank === 2 ? "text-slate-400" : "text-amber-700";

  const inner = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_14px_rgba(15,23,42,0.05)] p-4 active:scale-[0.99] transition">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <RankIcon className={`h-6 w-6 ${rankColor}`} />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[color:var(--color-brand-navy)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
            {rank}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10.5px] text-slate-500">{car.brand} · {car.bodyType}</div>
              <div className="text-[15px] font-bold text-[color:var(--color-brand-navy)] truncate">
                {car.model}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Match</div>
              <div className="text-[16px] font-black tabular-nums text-[color:var(--color-brand-navy)] leading-none mt-0.5">
                {match}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all duration-700"
                style={{ width: pop ? `${match}%` : "0%" }}
              />
            </div>
            <div className="text-[10.5px] tabular-nums text-slate-500 font-medium">
              {car.priceFrom.toLocaleString()}~{car.priceTo.toLocaleString()}만
            </div>
          </div>

          <div className="mt-2">
            <SnapshotBadge carId={car.id} currentPrice={car.priceFrom * 10000} variant="inline" />
          </div>

          {reasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {reasons.slice(0, 3).map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10.5px] font-medium"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onHeart}
          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition ${
            watched
              ? "bg-[color:var(--color-signal-buy)]/10 border-[color:var(--color-signal-buy)]/30 text-[color:var(--color-signal-buy)]"
              : "bg-white border-slate-200 text-slate-400"
          }`}
          aria-label="관심 담기"
        >
          <Heart className={`h-3.5 w-3.5 ${watched ? "fill-current" : ""}`} />
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

/* ============ Atoms ============ */

function MatchRing({ value, pop }: { value: number; pop: boolean }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = (value / 100) * c;
  const offset = pop ? c - target : c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#matchGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <defs>
          <linearGradient id="matchGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7FB4FF" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[18px] font-black tabular-nums leading-none">{value}</div>
        <div className="text-[8.5px] uppercase tracking-wider opacity-70 mt-0.5">Match</div>
      </div>
    </div>
  );
}

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[color:var(--color-brand-navy)] to-[color:var(--color-brand-blue)] text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm">
        AI
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-slate-100 px-4 py-3 text-[14px] leading-relaxed text-[color:var(--color-brand-navy)] font-semibold shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        {children}
      </div>
    </div>
  );
}
