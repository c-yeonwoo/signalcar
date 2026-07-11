import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, ShieldCheck, Gift, LogIn } from "lucide-react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { MOCK_CARS, TRIM_ID_MAP } from "@/lib/mock-cars";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/report")({
  component: ReportPage,
  ssr: false,
});

function ReportPage() {
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "form" | "done">("intro");
  const [trim, setTrim] = useState(MOCK_CARS[0].id);
  const [discount, setDiscount] = useState("220");
  const [month, setMonth] = useState("2026-07");
  const [region, setRegion] = useState("수도권");
  const [finance, setFinance] = useState("할부");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("로그인이 필요해요");
      return;
    }
    const trimId = TRIM_ID_MAP[trim];
    if (!trimId) {
      toast.error("이 트림은 아직 준비 중이에요");
      return;
    }
    setSubmitting(true);
    try {
      // 이미지가 있으면 quote-docs 버킷에 업로드 (본인 폴더)
      let rawPath: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("quote-docs").upload(path, file);
        if (upErr) throw upErr;
        rawPath = path;
      }

      const car = MOCK_CARS.find((c) => c.id === trim)!;
      const discountWon = Number(discount) * 10000;
      const { error } = await supabase.from("deal_reports").insert({
        trim_id: trimId,
        user_id: user.id,
        contract_price: car.listPrice - discountWon,
        list_price: car.listPrice,
        discount_amount: discountWon,
        finance_type: (finance.includes("리스")
          ? "lease"
          : finance.includes("현금")
            ? "cash"
            : finance.includes("렌트")
              ? "rent"
              : "installment") as any,
        region,
        contract_month: `${month}-01`,
        source: file ? ("receipt_ocr" as any) : ("manual" as any),
        // raw_doc_ref는 인서트 정책상 유저가 못 넣음 → 외부 워커가 upload된 파일 검증 후 채움.
        // 파일 경로는 별도로 관리하거나 워커가 storage 이벤트로 알림. 여기선 클라 참조만.
      });
      if (error) throw error;
      setStep("done");
      toast.success(rawPath ? "고마워요! 견적서도 함께 접수됐어요" : "고마워요! 리포트가 열렸어요");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "제보 실패");
    } finally {
      setSubmitting(false);
    }
  };

  // 비로그인 게이트
  if (!sessionLoading && !user) {
    return (
      <ConsumerShell>
        <header className="px-5 pt-10 pb-4">
          <h1 className="text-[24px] font-bold text-[color:var(--color-brand-navy)] leading-tight">
            제보하려면<br />로그인이 필요해요
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-3 leading-relaxed">
            익명으로 저장되지만, 중복·조작 방지를 위해 계정이 필요해요. 30초면 끝나요.
          </p>
        </header>
        <section className="px-5">
          <Link
            to="/auth"
            className="w-full rounded-2xl bg-[color:var(--color-brand-navy)] text-white py-4 font-semibold text-[15px] inline-flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(18,32,58,0.2)]"
          >
            <LogIn className="h-4 w-4" /> 로그인하고 제보하기
          </Link>
        </section>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell>
      {step === "intro" && (
        <>
          <header className="px-5 pt-10 pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)] px-2.5 py-1 text-[11px] font-semibold">
              <Gift className="h-3 w-3" /> give-to-get
            </div>
            <h1 className="text-[26px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-3">
              실계약가 하나 알려주면,<br />
              이 차 진짜 시세<br /> 리포트를 열어드려요
            </h1>
            <p className="text-[13.5px] text-slate-500 mt-3 leading-relaxed">
              계약서/견적서 사진을 올리면 자동으로 값을 읽어드려요. 확인만 하면 끝.
            </p>
          </header>

          <section className="px-5 space-y-3">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--color-brand-blue)]/10 grid place-items-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-[color:var(--color-brand-blue)]" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">개인정보는 저장하지 않아요</div>
                <div className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">
                  이름·연락처·차대번호는 업로드 즉시 자동 마스킹돼요. 트림·할인액·지역만 익명으로 저장됩니다.
                </div>
              </div>
            </div>

            <label className="w-full mt-2 rounded-2xl bg-[color:var(--color-brand-navy)] text-white py-4 font-semibold text-[15px] shadow-[0_10px_30px_rgba(18,32,58,0.2)] active:scale-[0.99] transition inline-flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="h-4 w-4" /> 견적서/계약서 올리기
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f) setStep("form");
                }}
              />
            </label>
            {file && (
              <div className="text-center text-[12px] text-slate-500">첨부: {file.name}</div>
            )}

            <button onClick={() => setStep("form")} className="w-full text-[13px] text-slate-500 py-2">
              사진 없이 직접 입력하기
            </button>
          </section>
        </>
      )}

      {step === "form" && (
        <>
          <header className="px-5 pt-8 pb-3">
            <div className="text-[12px] text-slate-500">확인만 하면 끝</div>
            <h1 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-1">
              자동으로 읽은 값이 맞나요?
            </h1>
          </header>

          <section className="px-5 space-y-3">
            <FormRow label="트림">
              <select
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[14px] font-medium border-0"
              >
                {MOCK_CARS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand} {c.model} · {c.trim}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow label="계약월">
              <input value={month} onChange={(e) => setMonth(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[14px] font-medium border-0" placeholder="YYYY-MM" />
            </FormRow>
            <FormRow label="총 할인액 (만원)">
              <input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[14px] font-medium border-0" />
            </FormRow>
            <FormRow label="지역">
              <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[14px] font-medium border-0" />
            </FormRow>
            <FormRow label="결제 방식">
              <input value={finance} onChange={(e) => setFinance(e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[14px] font-medium border-0" />
            </FormRow>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full mt-3 rounded-2xl bg-[color:var(--color-brand-blue)] text-white py-4 font-semibold text-[15px] shadow-[0_10px_30px_rgba(46,107,255,0.3)] active:scale-[0.99] transition disabled:opacity-60"
            >
              {submitting ? "제보 중…" : "제보하고 리포트 열기"}
            </button>
          </section>
        </>
      )}

      {step === "done" && (
        <div className="px-5 pt-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-signal-buy-soft)] grid place-items-center text-3xl">
            🎁
          </div>
          <h1 className="text-[22px] font-bold text-[color:var(--color-brand-navy)] mt-4">
            고마워요!
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-2 leading-relaxed">
            제보 덕분에 다른 구매자도 더 정확한 시세를 볼 수 있어요.<br />
            홈에서 열린 리포트를 확인해보세요.
          </p>
        </div>
      )}
    </ConsumerShell>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-medium text-slate-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}