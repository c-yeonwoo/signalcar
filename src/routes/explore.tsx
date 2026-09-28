import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import { CatalogGrid } from "@/components/catalog-grid";
import { SignalTopStrip } from "@/components/signal-top-strip";
import { fetchCarsFromDb } from "@/lib/cars";

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
  const catalog = useQuery({
    queryKey: ["cars"],
    queryFn: () => fetchCarsFromDb(),
    retry: 1,
  });
  const cars = catalog.data ?? [];

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="탐색"
        title="차 둘러보기"
        subtitle="현재 제공하는 차량을 살펴보고 관심에 담아보세요. 확인된 시그널은 별도로 표시해요."
      />

      {catalog.isPending ? (
        <div className="px-5 mt-4 text-sm text-slate-600" aria-live="polite">
          차량 정보를 불러오는 중이에요…
        </div>
      ) : catalog.isError ? (
        <div className="mx-5 mt-4 sc-card p-5 text-sm" role="alert">
          <p>차량 정보를 연결하지 못했어요. 잠시 후 다시 시도해주세요.</p>
          <button type="button" className="mt-3 underline" onClick={() => void catalog.refetch()}>
            다시 시도
          </button>
        </div>
      ) : cars.length === 0 ? (
        <div className="mx-5 mt-4 sc-card p-5 text-sm text-slate-600">
          현재 제공 가능한 차량 자료가 없어요. 자료를 확인한 뒤 다시 보여드릴게요.
        </div>
      ) : (
        <>
          <SignalTopStrip cars={cars} />
          <CatalogGrid cars={cars} />

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
        </>
      )}
    </ConsumerShell>
  );
}
