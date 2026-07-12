import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, ShieldCheck, LogIn, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { MOCK_CARS, TRIM_ID_MAP } from "@/lib/mock-cars";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PrimaryButton } from "@/components/ui-kit";
import { addMyReview } from "@/lib/onboarding-store";
import { earnCredit, getCreditBalance } from "@/lib/report-credits";
import { Ticket, BadgeCheck, Users } from "lucide-react";

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
      earnCredit(1);
      setStep("done");
      toast.success(rawPath ? "고마워요! 견적서도 함께 접수됐어요 · 열람권 +1장" : "고마워요! 열람권 +1장이 지급됐어요");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "공유 실패");
    } finally {
      setSubmitting(false);
    }
  };

  // 비로그인 게이트
  if (!sessionLoading && !user) {
    return (
      <ConsumerShell>
        <PageHeader
          eyebrow="Report"
          title={<>계약을 공유하려면<br />로그인이 필요해요</>}
          subtitle="익명으로 저장되지만, 중복·조작 방지를 위해 계정이 필요해요. 30초면 끝나요."
        />
        <section className="px-5">
          <Link to="/auth" className="sc-btn-primary">
            <LogIn className="h-4 w-4" /> 로그인하고 공유하기
          </Link>
        </section>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell>
      {step === "intro" && (
        <>
          <PageHeader
            eyebrow="Give to Get"
            title={<>실계약가 하나 알려주면,<br />이 차 진짜 시세를<br />열어드려요</>}
            subtitle="계약서·견적서 사진을 올리면 자동으로 값을 읽어드려요. 확인만 하면 끝."
          />

          <section className="px-5 space-y-3">
            {/* 명확한 보상 3종 */}
            <div className="rounded-2xl border border-[color:var(--color-brand-mist)] overflow-hidden">
              <div className="bg-[color:var(--color-brand-navy)] text-white px-4 py-3">
                <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-wider">
                  공유 1건 완료 시 즉시 지급
                </div>
                <div className="text-[15px] font-bold mt-0.5">받게 될 보상 3가지</div>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                <RewardRow
                  icon={<Ticket className="h-4 w-4" />}
                  title="협상 리포트 열람권 +1장"
                  desc="어느 차종에나 사용 가능 · 한 번 열면 계속 열람"
                  highlight
                />
                <RewardRow
                  icon={<BadgeCheck className="h-4 w-4" />}
                  title="실제 구매자 배지"
                  desc="내 리뷰에 인증 배지가 붙어 노출 우선순위 상승"
                />
                <RewardRow
                  icon={<Users className="h-4 w-4" />}
                  title="다음 구매자에게 실시세 기여"
                  desc={`현재 보유 열람권 ${getCreditBalance()}장`}
                />
              </div>
            </div>

            <div className="sc-card p-5 flex gap-3">
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

            <label className="sc-btn-primary cursor-pointer mt-2">
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
          <PageHeader
            eyebrow="확인만 하면 끝"
            title="자동으로 읽은 값이 맞나요?"
          />

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

            <PrimaryButton onClick={submit} disabled={submitting} className="mt-3 disabled:opacity-60">
              {submitting ? "공유 중…" : "공유하고 리포트 열기"}
            </PrimaryButton>
          </section>
        </>
      )}

      {step === "done" && (
        <ReportDone carId={trim} onSkip={() => navigate({ to: "/" })} />
      )}
    </ConsumerShell>
  );
}

function RewardRow({
  icon,
  title,
  desc,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${
          highlight
            ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[13px] font-semibold text-[color:var(--color-brand-navy)] ${highlight ? "" : ""}`}>
          {title}
        </div>
        <div className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ============ 제보 완료 → 리뷰 남기기 트리거 ============ */

function ReportDone({ carId, onSkip }: { carId: string; onSkip: () => void }) {
  const car = MOCK_CARS.find((c) => c.id === carId);
  const [rating, setRating] = useState(0);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!car) return;
    if (rating === 0) {
      toast.error("별점을 남겨주세요");
      return;
    }
    addMyReview({ carId: car.id, rating, pros: pros.trim(), cons: cons.trim() });
    setSaved(true);
    toast.success("리뷰가 저장됐어요 · 실제 구매자 배지가 붙어요");
  };

  return (
    <div className="px-5 pt-10 pb-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-[color:var(--color-signal-buy-soft)] grid place-items-center">
        <CheckCircle2 className="h-7 w-7 text-[color:var(--color-signal-buy)]" strokeWidth={2.2} />
      </div>
      <h1 className="text-center text-[22px] font-bold text-[color:var(--color-brand-navy)] mt-4">
        고마워요!
      </h1>
      <p className="text-center text-[13px] text-slate-500 mt-1.5 leading-relaxed">
        계약 공유 덕분에 다른 구매자도 더 정확한 시세를 볼 수 있어요.
      </p>

      <div className="mt-4 mx-auto w-fit inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)] px-3 py-1.5 text-[12.5px] font-bold">
        <Ticket className="h-3.5 w-3.5" /> 협상 리포트 열람권 +1장 지급
      </div>
      {car && (
        <Link
          to="/car/$vehicleId"
          params={{ vehicleId: car.id }}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-navy)] text-white py-3 text-[13.5px] font-semibold active:opacity-90"
        >
          지금 {car.model} 리포트 열러 가기
        </Link>
      )}

      {!saved ? (
        <section className="mt-7 sc-card p-5">
          <div className="text-[11px] font-semibold text-[color:var(--color-brand-blue)]">
            실제 구매자 리뷰
          </div>
          <h2 className="text-[16px] font-bold text-[color:var(--color-brand-navy)] mt-1 leading-snug">
            {car ? `${car.model} 실사용, ` : ""}한 줄만 남겨주실래요?
          </h2>
          <p className="text-[11.5px] text-slate-500 mt-1.5 leading-relaxed">
            계약이 확인된 리뷰만 노출돼요. 다음 구매자에게 큰 도움이 됩니다.
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="p-0.5"
                aria-label={`${n}점`}
              >
                <Star
                  className={`h-7 w-7 ${
                    n <= rating
                      ? "fill-[color:var(--color-signal-wait)] text-[color:var(--color-signal-wait)]"
                      : "text-slate-200"
                  }`}
                  strokeWidth={1.6}
                />
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <textarea
              value={pros}
              onChange={(e) => setPros(e.target.value)}
              placeholder="좋았던 점 (예: 승차감이 안정적이에요)"
              rows={2}
              className="w-full bg-slate-50 rounded-xl px-3.5 py-2.5 text-[13px] border-0 resize-none placeholder:text-slate-400"
            />
            <textarea
              value={cons}
              onChange={(e) => setCons(e.target.value)}
              placeholder="아쉬웠던 점 (예: 뒷좌석 소음이 있어요)"
              rows={2}
              className="w-full bg-slate-50 rounded-xl px-3.5 py-2.5 text-[13px] border-0 resize-none placeholder:text-slate-400"
            />
          </div>

          <PrimaryButton onClick={save} className="mt-4">
            리뷰 남기기
          </PrimaryButton>
          <button onClick={onSkip} className="w-full mt-2 py-2 text-[12.5px] text-slate-400">
            나중에 할게요
          </button>
        </section>
      ) : (
        <section className="mt-7 sc-card p-5 text-center">
          <p className="text-[13.5px] text-slate-600">
            소중한 리뷰가 등록됐어요.<br />마이 탭에서 확인할 수 있어요.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/" className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[13px] font-medium text-slate-700 text-center">
              홈으로
            </Link>
            {car && (
              <Link
                to="/car/$vehicleId"
                params={{ vehicleId: car.id }}
                className="flex-1 rounded-xl bg-[color:var(--color-brand-navy)] text-white py-2.5 text-[13px] font-semibold text-center"
              >
                내 차 상세 보기
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
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