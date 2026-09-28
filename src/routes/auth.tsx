import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string; mode?: "reset" } => ({
    ...(typeof s.next === "string" ? { next: s.next } : {}),
    ...(s.mode === "reset" ? { mode: s.mode } : {}),
  }),
});

type Mode = "signin" | "reset" | "update";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(
    search.mode === "reset" ? "reset" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (window.location.hash.includes("type=recovery") || query.get("type") === "recovery") {
      setMode("update");
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const goNext = () => {
    const next = search.next || "/";
    if (next.startsWith("/") && !next.startsWith("//")) {
      navigate({ to: next });
    } else {
      navigate({ to: "/" });
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("비밀번호를 변경했어요");
        goNext();
        return;
      }
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=signin`,
        });
        if (error) throw error;
        toast.success("비밀번호 재설정 메일을 보냈어요");
        setCheckEmail(true);
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("환영해요");
        goNext();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (!result.error) {
        if (!result.redirected) goNext();
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}${search.next || "/"}` },
      });
      if (error) throw error;
    } catch {
      toast.error("구글 로그인에 실패했어요. 이메일로 시도해주세요.");
      setLoading(false);
    }
  };

  const title =
    mode === "reset" ? (
      <>
        비밀번호
        <br />
        재설정
      </>
    ) : mode === "update" ? (
      <>
        새 비밀번호를<br />설정해주세요
      </>
    ) : (
      <>
        시그널카에
        <br />
        로그인
      </>
    );

  if (checkEmail) {
    return (
      <ConsumerShell hideTabs>
        <PageHeader
          backTo="/"
          backLabel="홈"
          eyebrow="Check email"
          title={<>메일을 확인해주세요</>}
        />
        <section className="px-5 mt-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong className="text-[color:var(--color-brand-navy)]">{email}</strong> 으로 안내
            메일을 보냈어요.
          </p>
          <p>
            메일 속 링크를 눌러 비밀번호 재설정을 이어가세요.
          </p>
          <button
            type="button"
            className="sc-btn-primary"
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
            }}
          >
            로그인으로
          </button>
        </section>
      </ConsumerShell>
    );
  }

  return (
    <ConsumerShell hideTabs>
      <PageHeader
        backTo="/"
        backLabel="나중에"
        eyebrow="Welcome"
        title={title}
        subtitle={mode === "update"
          ? "재설정 링크로 확인한 계정의 새 비밀번호를 입력해주세요."
          : mode === "reset"
            ? "기존 계정의 이메일로 재설정 링크를 보내드려요."
            : "이메일 신규 가입은 운영·개인정보 안내를 확정할 때까지 중단합니다. 기존 계정으로 로그인해주세요."}
      />

      <section className="px-5 mt-4">
        {mode === "signin" && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-2xl bg-white border border-slate-200 py-3.5 font-semibold text-[14px] text-[color:var(--color-brand-navy)] shadow-sm active:scale-[0.99] transition disabled:opacity-60"
          >
            Google 계정으로 로그인
          </button>
        )}
        <form onSubmit={handleEmail} className="space-y-2.5">
          {mode !== "update" && (
            <input
              type="email"
              required
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] border-0 outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/30"
            />
          )}
          {mode !== "reset" && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] border-0 outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/30"
            />
          )}
          <button type="submit" disabled={loading} className="sc-btn-primary disabled:opacity-60">
            {mode === "reset" ? (
              <>
                <KeyRound className="h-4 w-4" /> 재설정 메일 보내기
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" /> {mode === "update" ? "비밀번호 변경" : "로그인"}
              </>
            )}
          </button>
        </form>

        <div className="mt-3 space-y-1.5 text-center">
          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="w-full text-[12.5px] text-slate-500 py-1"
            >
              비밀번호를 잊었어요
            </button>
          )}
          {mode === "reset" && <button type="button" onClick={() => setMode("signin")} className="w-full text-[12.5px] text-slate-500 py-1">로그인으로 돌아가기</button>}
        </div>

        <p className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
          서비스 안내: {" "}
          <Link to="/terms" className="underline">
            이용약관
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="underline">
            개인정보처리방침
          </Link>
          을 확인할 수 있어요. 정식 정책은 검토 중입니다.
        </p>
      </section>
    </ConsumerShell>
  );
}
