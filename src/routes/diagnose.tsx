import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, FileImage, CheckCircle2, LogIn, Loader2 } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { formatKRW } from "@/lib/mock-cars";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/ui-kit";

export const Route = createFileRoute("/diagnose")({
  component: DiagnosePage,
  ssr: false,
});

function DiagnosePage() {
  const { user, loading: sessionLoading } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const [result, setResult] = useState<any>(null);

  const fileName = file?.name ?? null;

  const submit = async () => {
    if (!user || !file) return;
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("quote-docs").upload(path, file);
      if (upErr) throw upErr;
      const { data, error } = await supabase
        .from("quote_diagnoses")
        .insert({ user_id: user.id, doc_path: path })
        .select("id")
        .single();
      if (error) throw error;
      setDiagnosisId(data.id);
      setStatus("pending");
      toast.success("분석 대기열에 올렸어요");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setSubmitting(false);
    }
  };

  // 진단 결과 realtime 구독
  useEffect(() => {
    if (!diagnosisId) return;
    const channel = supabase
      .channel(`diag-${diagnosisId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quote_diagnoses", filter: `id=eq.${diagnosisId}` },
        (payload) => {
          const row = payload.new as any;
          setStatus(row.status);
          setResult(row.result);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [diagnosisId]);

  // 비로그인 게이트
  if (!sessionLoading && !user) {
    return (
      <ConsumerShell>
        <PageHeader
          eyebrow="Diagnose"
          title={<>견적서를 진단하려면<br />로그인이 필요해요</>}
          subtitle="업로드한 이미지는 본인만 볼 수 있게 저장돼요."
        />
        <section className="px-5">
          <Link to="/auth" className="sc-btn-primary">
            <LogIn className="h-4 w-4" /> 로그인
          </Link>
        </section>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell>
      <PageHeader
        eyebrow="견적서 진단"
        title={<>받은 견적,<br />좋은 조건인지 봐드릴게요</>}
        subtitle="견적서 사진을 올리면 실거래 분포와 비교해 상·중·하로 알려줘요."
      />

      <section className="px-5">
        <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer active:scale-[0.99] transition">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus("idle");
              setResult(null);
              setDiagnosisId(null);
            }}
          />
          <div className="mx-auto w-14 h-14 rounded-full bg-[color:var(--color-brand-blue)]/10 grid place-items-center">
            <Upload className="h-6 w-6 text-[color:var(--color-brand-blue)]" />
          </div>
          <div className="mt-3 text-[14px] font-semibold text-[color:var(--color-brand-navy)]">
            {fileName ? "다른 사진으로 변경" : "견적서 사진 올리기"}
          </div>
          <div className="mt-1 text-[12px] text-slate-500">JPG/PNG · 5MB 이하</div>
          {fileName && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-slate-600">
              <FileImage className="h-3.5 w-3.5" /> {fileName}
            </div>
          )}
        </label>

        {file && status === "idle" && (
          <PrimaryButton onClick={submit} disabled={submitting} className="mt-3 disabled:opacity-60">
            {submitting ? "업로드 중…" : "진단 요청하기"}
          </PrimaryButton>
        )}
      </section>

      {status === "pending" && (
        <section className="px-5 mt-4">
          <div className="sc-card p-6 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-[color:var(--color-brand-blue)]" />
            <div className="mt-3 text-[14px] font-semibold text-[color:var(--color-brand-navy)]">
              코치가 분석 중이에요…
            </div>
            <p className="text-[12.5px] text-slate-500 mt-1">
              실거래 분포와 비교해서 상/중/하 판정을 준비하고 있어요. 보통 1~2분이면 끝나요.
            </p>
          </div>
        </section>
      )}

      {status === "done" && result && (
        <section className="px-5 mt-4 space-y-3">
          <div className="sc-card p-5">
            <div className="text-[20px] font-bold text-[color:var(--color-brand-navy)]">
              {result.headline ?? "진단 완료"}
            </div>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              {result.summary ?? "결과가 도착했어요."}
            </p>
          </div>
        </section>
      )}

      {status === "idle" && fileName && (
        <section className="px-5 mt-4 space-y-3">
          <div className="sc-card p-5">
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]">
              데모 미리보기
            </span>
            <div className="text-[20px] font-bold text-[color:var(--color-brand-navy)] mt-3">
              진단 요청 전 예시 결과
            </div>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              나쁘진 않지만 평균보다 조금 비싸요. 실거래 중앙값 {formatKRW(36800000)} 대비{" "}
              <b>약 30만원</b> 더 깎을 여지가 있어 보여요.
            </p>
          </div>
          <p className="text-[11.5px] text-slate-400 text-center py-2">
            * 실제 OCR·판정은 외부 워커가 처리해요. "진단 요청하기"를 눌러야 실제 접수됩니다.
          </p>
        </section>
      )}
    </ConsumerShell>
  );
}