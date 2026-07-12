import { createFileRoute } from "@tanstack/react-router";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "개인정보 처리방침 · 시그널카" },
      { name: "description", content: "시그널카가 수집·이용하는 개인정보와 그 처리 방침입니다." },
      { property: "og:title", content: "개인정보 처리방침 · 시그널카" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <ConsumerShell hideTabs>
      <PageHeader backTo="/" backLabel="뒤로" eyebrow="Legal" title={<>개인정보<br />처리방침</>} />
      <section className="px-5 mt-4 text-[13px] leading-relaxed text-slate-700 space-y-4 pb-10">
        <p className="text-slate-500 text-[11.5px]">최종 업데이트: 2026-07-12 (MVP 초안)</p>

        <Block title="1. 수집하는 정보">
          <ul className="list-disc pl-4 space-y-0.5">
            <li>계정 정보: 이메일, 로그인 제공자(Google 등)에서 받은 프로필</li>
            <li>서비스 이용 정보: 관심 차량, 비교함, 상담 답변, 알림 임계값</li>
            <li>계약 제보 정보: 이용자가 자발적으로 업로드한 견적서·계약서 이미지(개인 식별정보는
              마스킹하여 저장), 계약가·프로모션·지역 등</li>
          </ul>
        </Block>

        <Block title="2. 이용 목적">
          가격 시그널·리포트 생성, 관심차 알림, 서비스 개선을 위한 통계 분석. 이용자가 동의하지 않는
          한 마케팅 목적으로 이용하지 않습니다.
        </Block>

        <Block title="3. 보관·파기">
          계약 제보 데이터는 개인 식별정보 마스킹 후 시세 통계 목적에 한해 최대 3년간 보관하며, 이용자가
          삭제를 요청하면 지체 없이 파기합니다. 계정 정보는 회원 탈퇴 시 즉시 삭제됩니다.
        </Block>

        <Block title="4. 제3자 제공">
          회사는 이용자의 별도 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 서비스 운영을 위해
          클라우드 호스팅·데이터베이스 등 위탁 처리자를 이용할 수 있으며, 위탁 시 목적과 범위에 필요한
          최소한의 정보만 제공합니다.
        </Block>

        <Block title="5. 이용자의 권리">
          이용자는 언제든 자신의 개인정보 열람·수정·삭제를 요청할 수 있으며, 마이 페이지에서
          관심차·상담 이력을 직접 관리할 수 있습니다.
        </Block>

        <Block title="6. 문의">
          개인정보 관련 문의: privacy@signalcar.example
        </Block>
      </section>
    </ConsumerShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)] mb-1.5">{title}</h2>
      <div>{children}</div>
    </div>
  );
}