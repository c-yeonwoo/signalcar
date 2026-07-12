import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, SlidersHorizontal, ArrowRight, Sparkles } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/coach/")({
  component: CoachHub,
  ssr: false,
});

function CoachHub() {
  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="AI 구매 코치"
        title={<>어떤 도움이<br />필요하세요?</>}
      />

      <section className="px-5 mt-5 space-y-3">
        <HubCard
          to="/coach/match"
          eyebrow="차종 추천 인터뷰"
          title="아직 어떤 차 살지 모르겠어요"
          desc="라이프스타일·예산·주행환경 몇 가지만 답하면, 지금 살 만한 차 3대를 추려드려요."
          icon={<Compass className="h-5 w-5" />}
          tint="from-[color:var(--color-brand-blue)] to-[#4A87FF]"
        />
        <HubCard
          to="/coach/options"
          eyebrow="옵션·견적 코치"
          title="이미 찍어둔 차가 있어요"
          desc="그 차 기준으로 꼭 필요한 옵션만 골라 맞춤 견적서를 만들어드려요."
          icon={<SlidersHorizontal className="h-5 w-5" />}
          tint="from-[color:var(--color-brand-navy)] to-slate-700"
        />

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            질문 결이 달라서 두 코치를 분리했어요. <b>추천 코치</b>는 "어떤 차?"에,{" "}
            <b>옵션 코치</b>는 "이 차, 어떻게 뽑을까?"에 집중합니다.
          </p>
        </div>
      </section>

      <div className="h-6" />
    </ConsumerShell>
  );
}

function HubCard({
  to,
  eyebrow,
  title,
  desc,
  icon,
  tint,
}: {
  to: string;
  eyebrow: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-2xl bg-gradient-to-br ${tint} text-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.14)] active:scale-[0.99] transition`}
    >
      <div className="flex items-center gap-2 text-[11.5px] opacity-85">
        {icon}
        <span>{eyebrow}</span>
      </div>
      <div className="mt-2 text-[17px] font-bold leading-snug">{title}</div>
      <p className="mt-2 text-[12.5px] leading-relaxed opacity-90">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold bg-white/15 rounded-full px-3 py-1.5">
        시작하기 <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
