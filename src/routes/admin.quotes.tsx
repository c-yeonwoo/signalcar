import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/admin/quotes")({
  component: QuoteReviewPage,
  ssr: false,
  head: () => ({ meta: [{ title: "견적 수동 검토 · 시그널카 관리자" }] }),
});

function QuoteReviewPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reviewer = useQuery({
    queryKey: ["quote-reviewer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_quote_reviewer");
      if (error) throw error;
      return data === true;
    },
  });
  const queue = useQuery({
    queryKey: ["quote-review-queue"],
    enabled: reviewer.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_diagnoses")
        .select("id, doc_path, status, created_at, reviewed_by")
        .in("status", ["pending", "reviewing"])
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  const selected = queue.data?.find((item) => item.id === selectedId);

  useEffect(() => {
    return () => {
      if (documentUrl) URL.revokeObjectURL(documentUrl);
    };
  }, [documentUrl]);

  const runAction = async (action: "claim" | "complete" | "fail", id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("review_quote_diagnosis", {
        p_diagnosis_id: id,
        p_action: action,
        p_headline: action === "complete" ? headline : null,
        p_summary: action === "complete" ? summary : action === "fail" ? failureReason : null,
      });
      if (error) throw error;
      if (action === "claim") {
        setSelectedId(id);
      } else {
        setSelectedId(null);
        setDocumentUrl(null);
        setHeadline("");
        setSummary("");
        setFailureReason("");
      }
      await queryClient.invalidateQueries({ queryKey: ["quote-review-queue"] });
      toast.success(action === "claim" ? "검토를 시작했어요" : action === "complete" ? "결과를 저장했어요" : "실패로 기록했어요");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "상태를 변경하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async () => {
    if (!selected || selected.status !== "reviewing" || selected.reviewed_by !== user?.id) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.storage.from("quote-docs").download(selected.doc_path);
      if (error) throw error;
      setDocumentUrl(URL.createObjectURL(data));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지를 열지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  if (reviewer.isPending) return <p className="text-sm text-muted-foreground">검토자 권한 확인 중…</p>;
  if (reviewer.isError) return <p className="text-sm text-destructive" role="alert">검토자 권한을 확인하지 못했어요.</p>;
  if (!reviewer.data) return <p className="text-sm text-muted-foreground">견적 검토 담당자로 지정되지 않았어요.</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">견적 수동 검토</h1>
        <p className="mt-1 text-sm text-muted-foreground">신규 접수는 현재 중단 중입니다. 기존 접수의 검토 상태만 처리합니다.</p>
      </div>
      {queue.isPending ? <p className="text-sm">대기열을 불러오는 중…</p> : queue.isError ? (
        <button type="button" className="text-sm underline" onClick={() => void queue.refetch()}>대기열을 불러오지 못했어요. 다시 시도</button>
      ) : queue.data.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">대기 중인 접수가 없어요.</p> : (
        <ul className="space-y-2">
          {queue.data.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm">
              <div>
                <p className="font-medium">접수 {item.id.slice(0, 8)} · {item.status === "pending" ? "대기" : "검토 중"}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("ko-KR")}</p>
              </div>
              {item.status === "pending" ? (
                <button type="button" disabled={busy} onClick={() => void runAction("claim", item.id)} className="rounded-lg bg-[color:var(--color-brand-navy)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">검토 맡기</button>
              ) : item.reviewed_by === user?.id ? (
                <button type="button" onClick={() => { setSelectedId(item.id); setDocumentUrl(null); }} className="rounded-lg border px-3 py-2 text-xs font-semibold">계속 검토</button>
              ) : <span className="text-xs text-muted-foreground">다른 담당자 검토 중</span>}
            </li>
          ))}
        </ul>
      )}

      {selected && selected.status === "reviewing" && selected.reviewed_by === user?.id && (
        <section className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="font-semibold">접수 {selected.id}</h2>
          <p className="text-xs text-muted-foreground">이미지에서 이름·연락처 등 개인 식별정보를 결과에 옮기지 마세요.</p>
          {!documentUrl ? (
            <button type="button" disabled={busy} onClick={() => void openDocument()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">견적 이미지 열기</button>
          ) : <img src={documentUrl} alt="검토 중인 견적 이미지" className="max-h-[480px] w-full rounded-lg border object-contain" />}
          <label className="block text-sm font-medium">결과 제목
            <input value={headline} maxLength={120} onChange={(event) => setHeadline(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">검토 설명
            <textarea value={summary} maxLength={2000} onChange={(event) => setSummary(event.target.value)} rows={5} className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">처리 실패 이유
            <input value={failureReason} maxLength={500} onChange={(event) => setFailureReason(event.target.value)} placeholder="예: 이미지가 열리지 않음" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy || !documentUrl || !headline.trim() || !summary.trim()} onClick={() => void runAction("complete", selected.id)} className="rounded-lg bg-[color:var(--color-brand-navy)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">검토 완료</button>
            <button type="button" disabled={busy || !failureReason.trim()} onClick={() => void runAction("fail", selected.id)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">처리 실패</button>
          </div>
        </section>
      )}
    </div>
  );
}
