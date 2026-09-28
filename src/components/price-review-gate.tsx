import { useQuery } from "@tanstack/react-query";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import { fetchCarsFromDb } from "@/lib/cars";

/** Consumer price flows stay closed until catalog, promotion and contract sources are reviewed. */
export function PriceReviewGate() {
  const catalog = useQuery({ queryKey: ["cars"], queryFn: () => fetchCarsFromDb(), retry: 1 });

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="차량 정보 점검 중"
        title={<>차량 가격과 구매 시점의<br />근거를 확인하고 있어요</>}
        subtitle="기존 가격·표본·프로모션 자료의 출처를 검수 중입니다. 확인되기 전에는 실거래 가격과 추천 판단을 보여드리지 않아요."
      />

      <section className="px-5 space-y-3">
        <div className="sc-card p-4 text-[12.5px] text-slate-600 leading-relaxed">
          계약 정보 공유와 견적 진단은 개인정보 처리·검토 운영 절차를 확인하는 동안 앱 화면에서 접수를 잠시 중단합니다. 검증된 가격 출처와 처리 경로를 준비한 뒤 다시 안내하겠습니다.
        </div>
      </section>

      <section className="px-5 mt-7 pb-8">
        <h2 className="text-[14px] font-bold text-[color:var(--color-brand-navy)]">자료 검수 대상 차량</h2>
        {catalog.isPending ? (
          <p className="mt-3 text-sm text-slate-500" aria-live="polite">차량 목록을 불러오는 중이에요…</p>
        ) : catalog.isError ? (
          <div className="mt-3 sc-card p-4 text-sm" role="alert">
            <p>차량 목록을 불러오지 못했어요.</p>
            <button type="button" className="mt-2 underline" onClick={() => void catalog.refetch()}>다시 시도</button>
          </div>
        ) : catalog.data.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">현재 제공할 수 있는 차량이 없어요.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {catalog.data.map((car) => (
              <li key={car.id} className="sc-card p-3.5">
                <p className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">{car.brand} {car.model}</p>
                <p className="mt-0.5 text-[11.5px] text-slate-500">{car.trim} · {car.bodyType}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsumerShell>
  );
}
