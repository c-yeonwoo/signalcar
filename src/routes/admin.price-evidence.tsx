import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/price-evidence")({
  component: PriceEvidencePage,
  ssr: false,
  head: () => ({ meta: [{ title: "정가 근거 검토 · 시그널카 관리자" }] }),
});

const todayInSeoul = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const won = (value: number) => `${new Intl.NumberFormat("ko-KR").format(value)}원`;

function PriceEvidencePage() {
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState("");
  const [trimId, setTrimId] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLocator, setSourceLocator] = useState("");
  const [validFrom, setValidFrom] = useState(todayInSeoul);
  const [validTo, setValidTo] = useState("");
  const [busy, setBusy] = useState(false);

  const vehicles = useQuery({
    queryKey: ["price-evidence-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id,model_name,brand_id")
        .order("model_name")
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });
  const brands = useQuery({
    queryKey: ["price-evidence-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name");
      if (error) throw error;
      return data;
    },
  });
  const trims = useQuery({
    queryKey: ["price-evidence-trims", vehicleId],
    enabled: !!vehicleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trims")
        .select("id,name,vehicle_id")
        .eq("vehicle_id", vehicleId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
  const evidence = useQuery({
    queryKey: ["price-evidence-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trim_msrp_evidence")
        .select("*,trims(name,vehicle_id)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const amountWon = Number(amount);
    if (!trimId || !Number.isSafeInteger(amountWon) || amountWon <= 0) {
      toast.error("트림과 양의 정수 가격을 확인해 주세요.");
      return;
    }
    try {
      if (new URL(sourceUrl).protocol !== "https:") throw new Error();
    } catch {
      toast.error("공식 가격표의 HTTPS 주소를 입력해 주세요.");
      return;
    }
    if (
      sourceLocator.trim().length < 3 ||
      sourceLocator.trim().length > 300 ||
      !validFrom ||
      (validTo && validTo < validFrom)
    ) {
      toast.error("가격표 위치와 적용 기간을 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("trim_msrp_evidence").insert({
        trim_id: trimId,
        amount_won: amountWon,
        source_url: sourceUrl.trim(),
        source_locator: sourceLocator.trim(),
        valid_from: validFrom,
        valid_to: validTo || null,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["price-evidence-list"] });
      setAmount("");
      setSourceUrl("");
      setSourceLocator("");
      setValidTo("");
      toast.success("검토 대기 초안을 저장했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "초안을 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const review = async (id: string, action: "publish" | "withdraw") => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_trim_msrp_evidence", {
        p_evidence_id: id,
        p_action: action,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["price-evidence-list"] });
      toast.success(action === "publish" ? "검증 가격을 공개했어요." : "검증 가격을 철회했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "검토 상태를 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const brandName = new Map((brands.data ?? []).map((brand) => [brand.id, brand.name]));
  const vehicleName = new Map(
    (vehicles.data ?? []).map((vehicle) => [
      vehicle.id,
      `${brandName.get(vehicle.brand_id) ?? "브랜드 미확인"} · ${vehicle.model_name}`,
    ]),
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정가 근거 검토</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          제조사 가격표의 차량 기본 가격을 기록합니다. 트림·금액·적용일·원문 위치를 직접 대조한 뒤
          공개하세요. 기존 트림 가격은 검증 근거로 옮기지 않았습니다.
        </p>
      </div>

      <form
        onSubmit={(event) => void createDraft(event)}
        className="space-y-4 rounded-xl border bg-white p-5"
      >
        <h2 className="font-semibold">검토 대기 초안</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            차종
            <select
              required
              value={vehicleId}
              onChange={(event) => {
                setVehicleId(event.target.value);
                setTrimId("");
              }}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            >
              <option value="">차종 선택</option>
              {(vehicles.data ?? []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {brandName.get(vehicle.brand_id) ?? "브랜드 미확인"} · {vehicle.model_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            트림
            <select
              required
              value={trimId}
              disabled={!vehicleId || trims.isPending}
              onChange={(event) => setTrimId(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-50"
            >
              <option value="">트림 선택</option>
              {(trims.data ?? []).map((trim) => (
                <option key={trim.id} value={trim.id}>
                  {trim.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            차량 기본 가격 (원)
            <input
              required
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            제조사 가격표 URL
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            원문 위치 (페이지·표·행)
            <input
              required
              minLength={3}
              maxLength={300}
              value={sourceLocator}
              onChange={(event) => setSourceLocator(event.target.value)}
              placeholder="예: 2026년 9월 가격표 3쪽, 2.5 터보 프리미엄 행"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            적용 시작일
            <input
              required
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium">
            적용 종료일 (있을 때)
            <input
              type="date"
              min={validFrom}
              value={validTo}
              onChange={(event) => setValidTo(event.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
        {(vehicles.isError || brands.isError || trims.isError) && (
          <p role="alert" className="text-sm text-destructive">
            차종 목록을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || vehicles.isError || brands.isError || trims.isError}
          className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          초안 저장
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">최근 근거 100건</h2>
        {evidence.isPending ? (
          <p className="text-sm text-muted-foreground">근거를 불러오는 중…</p>
        ) : evidence.isError ? (
          <button
            type="button"
            className="text-sm underline"
            onClick={() => void evidence.refetch()}
          >
            목록을 불러오지 못했어요. 다시 시도
          </button>
        ) : evidence.data.length === 0 ? (
          <p className="rounded-xl border p-5 text-sm text-muted-foreground">
            등록된 정가 근거가 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {evidence.data.map((item) => (
              <li key={item.id} className="space-y-2 rounded-xl border bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{won(item.amount_won)}</strong>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {item.status === "draft"
                      ? "검토 대기"
                      : item.status === "verified"
                        ? "검증 공개"
                        : "철회"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {vehicleName.get(item.trims?.vehicle_id ?? "") ?? "차종 미확인"} ·{" "}
                    {item.trims?.name ?? item.trim_id.slice(0, 8)}
                  </span>
                </div>
                <p>
                  원문:{" "}
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline"
                  >
                    {item.source_url}
                  </a>{" "}
                  · {item.source_locator}
                </p>
                <p className="text-xs text-muted-foreground">
                  적용 {item.valid_from} ~ {item.valid_to ?? "종료일 미상"} · 확인{" "}
                  {new Date(item.captured_at).toLocaleString("ko-KR")} · 재검토{" "}
                  {item.review_due_at
                    ? new Date(item.review_due_at).toLocaleString("ko-KR")
                    : "미정"}
                </p>
                {item.status === "draft" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(item.id, "publish")}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    원문 대조 후 공개
                  </button>
                )}
                {item.status === "verified" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void review(item.id, "withdraw")}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    철회
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
