import { createFileRoute } from "@tanstack/react-router";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "이용약관 · 시그널카" },
      { name: "description", content: "시그널카 서비스 이용약관입니다." },
      { property: "og:title", content: "이용약관 · 시그널카" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
});

function TermsPage() {
  return (
    <ConsumerShell hideTabs>
      <PageHeader backTo="/" backLabel="뒤로" eyebrow="Legal" title={<>이용약관</>} />
      <section className="px-5 mt-4 text-[13px] leading-relaxed text-slate-700 space-y-4 pb-10">
        <p className="text-slate-500 text-[11.5px]">최종 업데이트: 2026-07-12 (MVP 초안)</p>

        <Block title="1. 목적">
          이 약관은 시그널카(이하 "회사")가 제공하는 신차 구매 코칭 서비스(이하 "서비스")의 이용 조건과
          절차, 회사와 이용자의 권리·의무 등을 정합니다.
        </Block>

        <Block title="2. 서비스의 성격">
          서비스는 공개 정보와 이용자가 자발적으로 공유한 계약 정보를 바탕으로 신차 구매 판단을 돕는
          <strong> 정보 제공 및 코칭 </strong>서비스입니다. 회사는 자동차 판매·중개·리스·금융 상품을
          직접 판매하지 않으며, 특정 딜러·브랜드와 광고 계약이 있을 경우 해당 사실을 화면에 표기합니다.
        </Block>

        <Block title="3. 이용자의 계정과 계약 제보">
          이용자는 실제 본인의 계약 정보만 제보해야 하며, 허위·과장 정보 제보로 발생한 문제에 대해서는
          회사가 책임지지 않습니다. 회사는 제보 데이터의 진위 확인을 위해 마스킹된 계약서 이미지 등
          최소한의 자료를 요청할 수 있습니다.
        </Block>

        <Block title="4. 정보의 정확성과 면책">
          서비스가 제공하는 시세·시그널·프로모션 정보는 참고용이며, 최종 계약 조건은 딜러와 이용자의
          협의로 결정됩니다. 회사는 정보의 정확성 확보를 위해 노력하나, 정보 오류·지연으로 발생한
          손해에 대해 법령이 허용하는 최대 범위에서 책임을 지지 않습니다.
        </Block>

        <Block title="5. 금지 행위">
          자동화된 방법으로 서비스 데이터를 무단 수집하거나, 타인 정보로 계약을 제보하거나, 서비스를
          영업 목적(딜러 홍보 등)으로 무단 이용하는 행위는 금지됩니다.
        </Block>

        <Block title="6. 문의">
          약관 관련 문의: hello@signalcar.example (문의 이메일은 정식 서비스 오픈 시 안내됩니다.)
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