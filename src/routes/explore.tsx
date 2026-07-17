import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import { CatalogGrid } from "@/components/catalog-grid";
import { SignalTopStrip } from "@/components/signal-top-strip";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "차 둘러보기 · 시그널카" },
      {
        name: "description",
        content: "실거래 시그널이 있는 차종을 둘러보고 관심에 담으세요.",
      },
      { property: "og:title", content: "차 둘러보기 · 시그널카" },
      {
        property: "og:description",
        content: "카탈로그와 BUY 시그널로 관심 차를 고르세요.",
      },
    ],
  }),
});

function ExplorePage() {
  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="탐색"
        title="차 둘러보기"
        subtitle="실거래·프로모 시그널이 있는 차종만 보여드려요. 마음에 드는 차는 하트로 관심에 담아보세요."
      />

      <SignalTopStrip />

      <CatalogGrid />

      <section className="px-5 mt-6 mb-4">
        <Link
          to="/coach/match"
          className="flex items-center justify-between rounded-2xl bg-[color:var(--color-brand-navy)] text-white px-5 py-4 active:scale-[0.99] transition"
        >
          <div>
            <div className="text-[13px] font-semibold">내게 맞는 차 찾기</div>
            <div className="text-[11px] opacity-70 mt-0.5">6문항으로 후보 3대 추천</div>
          </div>
          <ArrowUpRight className="h-4 w-4 opacity-80" />
        </Link>
      </section>
    </ConsumerShell>
  );
}
