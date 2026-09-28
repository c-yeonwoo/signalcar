import { createFileRoute, Link } from "@tanstack/react-router";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/car/$vehicleId/briefing")({
  component: BriefingUnavailable,
  ssr: false,
  head: () => ({ meta: [{ title: "협상 리포트 점검 중 · 시그널카" }] }),
});

function BriefingUnavailable() {
  const { vehicleId } = Route.useParams();
  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="협상 리포트"
        title="가격 근거를 검수하고 있어요"
        subtitle="실거래 제보의 출처와 표본을 확인하기 전에는 목표가나 할인 가능 금액을 제시하지 않아요."
      />
      <section className="px-5">
        <Link to="/car/$vehicleId" params={{ vehicleId }} className="sc-btn-primary">차량 상세로 돌아가기</Link>
      </section>
    </ConsumerShell>
  );
}
