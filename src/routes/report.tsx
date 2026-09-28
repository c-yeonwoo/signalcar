import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader, PrimaryButton } from "@/components/ui-kit";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { fetchCarsFromDb } from "@/lib/cars";

export const Route = createFileRoute("/report")({
  component: ReportPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "계약 정보 공유 · 시그널카" },
      { name: "description", content: "계약 정보 접수는 개인정보와 검토 운영 절차를 확인하는 동안 중단됩니다." },
      { property: "og:title", content: "계약 정보 공유 · 시그널카" },
      { property: "og:description", content: "계약 정보 접수 준비 중입니다." },
      { property: "og:url", content: "/report" },
    ],
    links: [{ rel: "canonical", href: "/report" }],
  }),
});

const EMPTY_CARS: Awaited<ReturnType<typeof fetchCarsFromDb>> = [];

function ReportPage() {
  const { user, loading: sessionLoading } = useSession();
  const carsQuery = useQuery({ queryKey: ["cars"], queryFn: () => fetchCarsFromDb(), retry: 1 });
  const cars = carsQuery.data ?? EMPTY_CARS;
  const [trim, setTrim] = useState("");
  const [contractPrice, setContractPrice] = useState("");
  const [month, setMonth] = useState("");
  const [region, setRegion] = useState("");
  const [finance, setFinance] = useState<"cash" | "installment" | "lease" | "rent">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!trim && cars[0]) setTrim(cars[0].id);
  }, [cars, trim]);

  const submit = async () => {
    if (!user) return;
    const car = cars.find((item) => item.id === trim);
    if (!car) {
      toast.error("차량을 다시 선택해주세요.");
      return;
    }
    const priceInManwon = Number(contractPrice);
    if (!Number.isSafeInteger(priceInManwon) || priceInManwon <= 0) {
      toast.error("실제 계약 금액을 만원 단위로 입력해주세요.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      toast.error("계약월을 YYYY-MM 형식으로 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("deal_reports")
        .insert({
          trim_id: car.trimId,
          user_id: user.id,
          contract_price: priceInManwon * 10_000,
          list_price: null,
          discount_amount: null,
          finance_type: finance,
          region: region || null,
          contract_month: `${month}-01`,
          source: "manual",
        })
        .select("id")
        .single();
      if (error) throw error;
      setReportId(data.id);
      toast.success("계약 정보가 접수됐어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "접수에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionLoading) {
    return <ConsumerShell><p className="px-5 py-10 text-sm text-slate-500">계정 정보를 확인하는 중이에요…</p></ConsumerShell>;
  }

  if (!user) {
    return (
      <ConsumerShell>
        <PageHeader eyebrow="계약 공유" title="계약 정보를 공유하려면 로그인해주세요" subtitle="본인 제보를 관리할 수 있도록 계정에 연결해 보관해요." />
        <section className="px-5">
          <Link to="/auth" search={{ next: "/report" }} className="sc-btn-primary"><LogIn className="h-4 w-4" /> 로그인</Link>
        </section>
      </ConsumerShell>
    );
  }

  if (reportId) {
    return (
      <ConsumerShell>
        <PageHeader eyebrow="접수 완료" title="계약 정보가 접수됐어요" subtitle="제보는 검증되기 전까지 실거래 통계나 구매 시그널에 반영되지 않아요." />
        <section className="px-5 space-y-3 text-sm text-slate-600">
          <p className="sc-card p-4 break-all">접수 ID: {reportId}</p>
          <Link to="/" className="sc-btn-primary">홈으로 돌아가기</Link>
        </section>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="계약 공유"
        title="계약 조건을 직접 알려주세요"
        subtitle="문서 업로드 없이 계약 정보를 입력할 수 있어요. 검증 전에는 실거래 통계에 쓰지 않아요."
      />

      {carsQuery.isPending ? (
        <p className="px-5 text-sm text-slate-500" aria-live="polite">차량 정보를 불러오는 중이에요…</p>
      ) : carsQuery.isError ? (
        <section className="mx-5 sc-card p-5 text-sm" role="alert">
          <p>차량 정보를 연결하지 못했어요.</p>
          <button type="button" className="mt-2 underline" onClick={() => void carsQuery.refetch()}>다시 시도</button>
        </section>
      ) : cars.length === 0 ? (
        <p className="mx-5 sc-card p-5 text-sm text-slate-500">현재 선택할 수 있는 차량이 없어요.</p>
      ) : (
        <section className="px-5 space-y-4">
          <p className="sc-card p-4 text-[12.5px] text-slate-600 leading-relaxed">
            본인이 실제로 계약한 차량만 입력해주세요. 연락처·차대번호·상세 주소는 받지 않아요. 이 화면에서는 견적서 이미지를 저장하지 않습니다.
          </p>

          <label className="block text-[12px] font-semibold text-slate-600">
            차량·트림
            <select value={trim} onChange={(event) => setTrim(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              {cars.map((car) => <option key={car.id} value={car.id}>{car.brand} {car.model} · {car.trim}</option>)}
            </select>
          </label>
          <label className="block text-[12px] font-semibold text-slate-600">
            계약 금액 (만원)
            <input inputMode="numeric" type="number" min="1" step="1" value={contractPrice} onChange={(event) => setContractPrice(event.target.value)} placeholder="실제 계약 금액" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
          </label>
          <label className="block text-[12px] font-semibold text-slate-600">
            계약월
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" />
          </label>
          <label className="block text-[12px] font-semibold text-slate-600">
            지역 (선택)
            <select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">공유하지 않기</option>
              <option value="수도권">수도권</option>
              <option value="충청권">충청권</option>
              <option value="전라권">전라권</option>
              <option value="경상권">경상권</option>
              <option value="강원·제주">강원·제주</option>
            </select>
          </label>
          <label className="block text-[12px] font-semibold text-slate-600">
            결제 방식
            <select value={finance} onChange={(event) => setFinance(event.target.value as typeof finance)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="cash">현금</option>
              <option value="installment">할부</option>
              <option value="lease">리스</option>
              <option value="rent">장기렌트</option>
            </select>
          </label>
          <PrimaryButton onClick={submit} disabled={submitting} className="disabled:opacity-60">
            {submitting ? "접수 중…" : "계약 정보 접수하기"}
          </PrimaryButton>
        </section>
      )}
    </ConsumerShell>
  );
}
