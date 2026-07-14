import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RefreshCw,
  Play,
  Clock,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSession } from "@/hooks/use-session";
import {
  LOOP_JOBS,
  LOOP_SCHEDULE,
  type LoopJobStatus,
  type LoopStatusFile,
} from "@/lib/ingest-loop";
import loopStatusSeed from "@/data/ingest-loop-status.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/ingest")({
  component: IngestLoopPage,
  ssr: false,
});

type ConfigRow = Tables<"ingest_loop_config">;
type RunRow = Tables<"ingest_runs">;
type RequestRow = Tables<"ingest_run_requests">;

function statusMeta(s: LoopJobStatus | string) {
  switch (s) {
    case "ok":
      return { label: "갱신됨", variant: "default" as const, icon: CheckCircle2 };
    case "skipped_unchanged":
      return { label: "변경 없음", variant: "secondary" as const, icon: MinusCircle };
    case "skipped_disabled":
      return { label: "비활성", variant: "outline" as const, icon: Ban };
    case "error":
      return { label: "오류", variant: "destructive" as const, icon: AlertCircle };
    case "never":
      return { label: "미실행", variant: "outline" as const, icon: Clock };
    case "pending":
      return { label: "대기", variant: "secondary" as const, icon: Clock };
    default:
      return { label: s, variant: "outline" as const, icon: Clock };
  }
}

function IngestLoopPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const seed = loopStatusSeed as LoopStatusFile;

  const configQ = useQuery({
    queryKey: ["ingest-loop-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingest_loop_config").select("*");
      if (error) throw error;
      return (data ?? []) as ConfigRow[];
    },
    retry: false,
  });

  const runsQ = useQuery({
    queryKey: ["ingest-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
    retry: false,
  });

  const reqsQ = useQuery({
    queryKey: ["ingest-run-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_run_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
    retry: false,
  });

  const toggleMut = useMutation({
    mutationFn: async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      const { error } = await supabase.from("ingest_loop_config").upsert({
        job_id: jobId,
        enabled,
        updated_at: new Date().toISOString(),
        updated_by: user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingest-loop-config"] });
      toast.success("루프 설정이 저장됐어요");
    },
    onError: (e: Error) => toast.error(e.message || "설정 저장 실패 (마이그레이션 확인)"),
  });

  const requestMut = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.from("ingest_run_requests").insert({
        job_id: jobId,
        status: "pending",
        requested_by: user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingest-run-requests"] });
      toast.success("실행 요청이 등록됐어요. 다음 loop 워커가 처리합니다.");
    },
    onError: (e: Error) => toast.error(e.message || "실행 요청 실패"),
  });

  const enabledOf = (jobId: string) => {
    const row = configQ.data?.find((c) => c.job_id === jobId);
    if (row) return row.enabled;
    const seedJob = seed.jobs.find((j) => j.jobId === jobId);
    return seedJob?.enabled ?? LOOP_JOBS.find((j) => j.id === jobId)?.defaultEnabled ?? true;
  };

  const runtimeOf = (jobId: string) => seed.jobs.find((j) => j.jobId === jobId);

  const dbUnavailable = configQ.isError || runsQ.isError || reqsQ.isError;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">데이터 갱신 루프</h1>
          <p className="text-sm text-muted-foreground mt-1">
            하루 1회 크롤링하되, fingerprint가 같으면 갱신하지 않습니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["ingest-loop-config"] });
            qc.invalidateQueries({ queryKey: ["ingest-runs"] });
            qc.invalidateQueries({ queryKey: ["ingest-run-requests"] });
          }}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              스케줄
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-lg font-semibold">{LOOP_SCHEDULE.cron}</p>
            <p className="text-xs text-muted-foreground mt-1">{LOOP_SCHEDULE.timezone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              변경 감지
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">SHA-256 16자</p>
            <p className="text-xs text-muted-foreground mt-1">동일하면 skipped_unchanged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">로컬 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm tabular-nums">
              {seed.updatedAt ? new Date(seed.updatedAt).toLocaleString("ko-KR") : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">src/data/ingest-loop-status.json</p>
          </CardContent>
        </Card>
      </div>

      {dbUnavailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          DB 테이블이 아직 없거나 권한이 없습니다. 마이그레이션{" "}
          <code className="text-xs">20260714200000_ingest_loop.sql</code> 적용 후 토글·실행
          요청이 활성화됩니다. 아래 작업 정의·로컬 상태는 계속 볼 수 있어요.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">루프 작업</CardTitle>
          <CardDescription>
            활성 작업만 스케줄/요청 시 실행됩니다. 「지금 실행」은 pending 요청을 넣고, 워커{" "}
            <code className="text-xs">bun workers/ingest/run.ts loop</code> 가 claim합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>활성</TableHead>
                <TableHead>작업</TableHead>
                <TableHead>주기</TableHead>
                <TableHead>최근 상태</TableHead>
                <TableHead>fingerprint</TableHead>
                <TableHead className="text-right">실행</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LOOP_JOBS.map((job) => {
                const rt = runtimeOf(job.id);
                const st = statusMeta(rt?.lastStatus ?? "never");
                const Icon = st.icon;
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Switch
                        checked={enabledOf(job.id)}
                        disabled={toggleMut.isPending || dbUnavailable}
                        onCheckedChange={(v) => toggleMut.mutate({ jobId: job.id, enabled: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{job.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[280px]">
                        {job.description}
                      </div>
                      {job.previewOnly && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          preview only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{job.cadence}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      {rt?.lastRunAt && (
                        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                          {new Date(rt.lastRunAt).toLocaleString("ko-KR")}
                        </p>
                      )}
                      {rt?.lastError && (
                        <p className="text-[11px] text-destructive mt-0.5 truncate max-w-[180px]">
                          {rt.lastError}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {rt?.lastFingerprint ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={requestMut.isPending || dbUnavailable}
                        onClick={() => requestMut.mutate(job.id)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        지금
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={requestMut.isPending || dbUnavailable}
          onClick={() => requestMut.mutate("all")}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          전체 일일 루프 요청
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText("bun workers/ingest/run.ts loop");
            toast.success("CLI 명령을 복사했어요");
          }}
        >
          CLI 복사
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">설계 요약</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
          <p>
            <strong className="text-foreground">Trigger</strong> — GitHub Actions{" "}
            <code className="text-xs">0 6 * * *</code> (KST) 또는 관리자 실행 요청 → 워커 claim.
          </p>
          <p>
            <strong className="text-foreground">Diff</strong> — 파이프라인 결과 fingerprint. 동일하면
            파일/DB upsert 생략.
          </p>
          <p>
            <strong className="text-foreground">Write</strong> — service_role로{" "}
            <code className="text-xs">source_documents</code> / <code className="text-xs">news_items</code>{" "}
            / <code className="text-xs">price_signals</code> 및 <code className="text-xs">ingest_runs</code>{" "}
            기록. 다나와는 preview JSON만.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 실행 요청</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작업</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>요청</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reqsQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : !reqsQ.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      요청 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  reqsQ.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.job_id}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {new Date(r.requested_at).toLocaleString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ingest_runs (DB)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>파이프라인</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시각</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsQ.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      …
                    </TableCell>
                  </TableRow>
                ) : !runsQ.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      기록 없음
                    </TableCell>
                  </TableRow>
                ) : (
                  runsQ.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.pipeline}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {new Date(r.started_at).toLocaleString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
