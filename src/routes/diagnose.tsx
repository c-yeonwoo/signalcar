import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Upload, FileImage, LogIn, Loader2 } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/ui-kit";
import { MAX_QUOTE_IMAGE_BYTES, quoteImagePath, validateQuoteImage } from "@/lib/quote-image";
import type { Json } from "@/integrations/supabase/types";

const QUOTE_INTAKE_OPEN = false;

function resultText(value: Json | null, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

export const Route = createFileRoute("/diagnose")({
  component: DiagnosePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "견적서 진단 · 시그널카" },
      { name: "description", content: "견적 진단 신규 접수는 중단 중이며 기존 접수 기록은 확인·삭제할 수 있습니다." },
      { property: "og:title", content: "견적서 진단 · 시그널카" },
      { property: "og:description", content: "신규 접수 준비 중 · 기존 기록 확인·삭제" },
      { property: "og:url", content: "/diagnose" },
    ],
    links: [{ rel: "canonical", href: "/diagnose" }],
  }),
});

function DiagnosePage() {
  const { user, loading: sessionLoading } = useSession();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [redactionConfirmed, setRedactionConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const [result, setResult] = useState<Json | null>(null);
  const diagnoses = useQuery({
    queryKey: ["quote-diagnoses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_diagnoses")
        .select("id, status, result, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fileName = file?.name ?? null;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submit = async () => {
    if (!user || !file || !redactionConfirmed) return;
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      const image = await validateQuoteImage(file);
      const path = quoteImagePath(user.id, image.extension);
      const { error: upErr } = await supabase.storage.from("quote-docs").upload(path, file, {
        contentType: image.contentType,
        upsert: false,
      });
      if (upErr) throw upErr;
      uploadedPath = path;
      const { data, error } = await supabase
        .from("quote_diagnoses")
        .insert({ user_id: user.id, doc_path: path })
        .select("id")
        .single();
      if (error) throw error;
      setDiagnosisId(data.id);
      setStatus("pending");
      void diagnoses.refetch();
      toast.success("분석 대기열에 올렸어요");
    } catch (err) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("quote-docs").remove([uploadedPath]);
        if (cleanupError) {
          toast.error("접수 실패 후 파일 삭제도 실패했어요. 고객 지원에 삭제를 요청해주세요.");
          setSubmitting(false);
          return;
        }
      }
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDiagnosis = async (id: string) => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error: lookupError } = await supabase
        .from("quote_diagnoses")
        .select("doc_path")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (lookupError) throw lookupError;
      const { error: storageError } = await supabase.storage.from("quote-docs").remove([data.doc_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from("quote_diagnoses").delete().eq("id", id);
      if (rowError) throw rowError;
      if (diagnosisId === id) {
        setDiagnosisId(null);
        setFile(null);
        setResult(null);
        setStatus("idle");
        setRedactionConfirmed(false);
      }
      void diagnoses.refetch();
      toast.success("접수 기록과 이미지를 삭제했어요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했어요. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
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
          const row = payload.new;
          if (row.status === "pending" || row.status === "done" || row.status === "failed") {
            setStatus(row.status);
          }
          setResult((row.result ?? null) as Json | null);
          void queryClient.invalidateQueries({ queryKey: ["quote-diagnoses", user?.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [diagnosisId, queryClient, user?.id]);

  if (sessionLoading) {
    return <ConsumerShell><p className="px-5 py-10 text-sm text-slate-500">계정 정보를 확인하는 중이에요…</p></ConsumerShell>;
  }

  if (!user) {
    return (
      <ConsumerShell>
        <PageHeader
          eyebrow="Diagnose"
          title={<>내 견적 접수 기록을 보려면<br />로그인이 필요해요</>}
          subtitle="신규 접수는 운영 절차를 확인하는 동안 중단됩니다. 기존 기록은 확인·삭제할 수 있어요."
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
        title={QUOTE_INTAKE_OPEN ? <>받은 견적,<br />좋은 조건인지 봐드릴게요</> : "내 견적 접수 기록"}
        subtitle={QUOTE_INTAKE_OPEN
          ? "이름·연락처·차대번호·주소를 가린 견적서만 올려주세요. 자동 가림 기능은 아직 없어요."
          : "신규 접수는 검토 절차를 확인하는 동안 중단됩니다. 기존 기록은 다시 열거나 삭제할 수 있어요."}
      />

      {QUOTE_INTAKE_OPEN && <section className="px-5">
        <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer active:scale-[0.99] transition">
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              if (selected &&
                (selected.size > MAX_QUOTE_IMAGE_BYTES ||
                  (selected.type !== "image/jpeg" && selected.type !== "image/png"))) {
                toast.error("JPG 또는 PNG 이미지만 5MB 이하로 올려주세요.");
                e.target.value = "";
                setFile(null);
                setRedactionConfirmed(false);
                return;
              }
              setFile(selected);
              setRedactionConfirmed(false);
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

        {previewUrl && (
          <div className="mt-3 sc-card p-4">
            <p className="text-[12px] font-semibold text-[color:var(--color-brand-navy)]">올릴 이미지 확인</p>
            <img src={previewUrl} alt="선택한 견적서 미리보기" className="mt-3 max-h-80 w-full object-contain" />
            <label className="mt-3 flex items-start gap-2 text-[12px] text-slate-600">
              <input
                type="checkbox"
                checked={redactionConfirmed}
                onChange={(e) => setRedactionConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              이름·연락처·차대번호·주소 등 개인 식별정보를 직접 가린 파일인지 확인했어요.
            </label>
          </div>
        )}

        {file && status === "idle" && (
          <PrimaryButton onClick={submit} disabled={submitting || !redactionConfirmed} className="mt-3 disabled:opacity-60">
            {submitting ? "업로드 중…" : "진단 요청하기"}
          </PrimaryButton>
        )}
      </section>}

      {status === "pending" && (
        <section className="px-5 mt-4">
          <div className="sc-card p-6 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-[color:var(--color-brand-blue)]" />
            <div className="mt-3 text-[14px] font-semibold text-[color:var(--color-brand-navy)]">
              견적서가 접수됐어요
            </div>
            <p className="text-[12.5px] text-slate-500 mt-1">
              검토 처리 상태를 확인 중이에요. 결과가 준비되면 이 화면에 표시돼요.
            </p>
          </div>
        </section>
      )}

      {status === "done" && result && (
        <section className="px-5 mt-4 space-y-3">
          <div className="sc-card p-5">
            <div className="text-[20px] font-bold text-[color:var(--color-brand-navy)]">
              {resultText(result, "headline") ?? "진단 완료"}
            </div>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              {resultText(result, "summary") ?? "결과가 도착했어요."}
            </p>
          </div>
        </section>
      )}

      {status === "failed" && (
        <p className="px-5 mt-4 text-sm text-slate-600" role="alert">검토에 실패했어요. 파일을 확인해 다시 접수해주세요.</p>
      )}

      <section className="px-5 mt-6 pb-8">
        <h2 className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">내 접수 기록</h2>
        {diagnoses.isPending ? (
          <p className="mt-2 text-[12px] text-slate-500">기록을 불러오는 중이에요…</p>
        ) : diagnoses.isError ? (
          <button type="button" className="mt-2 text-[12px] underline" onClick={() => void diagnoses.refetch()}>기록을 불러오지 못했어요. 다시 시도</button>
        ) : diagnoses.data?.length ? (
          <ul className="mt-2 space-y-2">
            {diagnoses.data.map((item) => (
              <li key={item.id} className="sc-card p-3 flex items-center justify-between gap-3 text-[12px]">
                <button
                  type="button"
                  className="text-left text-slate-600"
                  onClick={() => {
                    setDiagnosisId(item.id);
                    setStatus(item.status);
                    setResult(item.result);
                  }}
                >
                  {item.created_at.slice(0, 10)} · {item.status === "done" ? "완료" : item.status === "failed" ? "실패" : "대기"}
                </button>
                <button type="button" className="text-slate-500 underline disabled:opacity-50" disabled={deleting} onClick={() => void deleteDiagnosis(item.id)}>
                  {deleting ? "삭제 중…" : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-slate-500">접수 기록이 없어요.</p>
        )}
      </section>
    </ConsumerShell>
  );
}
