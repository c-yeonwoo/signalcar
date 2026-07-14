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
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/",
    mode: s.mode === "signup" || s.mode === "reset" ? s.mode : undefined,
  }),
});

type Mode = "signin" | "signup" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(
    search.mode === "signup" ? "signup" : search.mode === "reset" ? "reset" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.next || "/" });
    });
  }, [navigate, search.next]);

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
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${search.next || "/"}` },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("가입이 완료됐어요");
        goNext();
      } else {
        setCheckEmail(true);
        toast.success("가입 확인 메일을 보냈어요");
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
      // Lovable OAuth 우선, 실패 시 Supabase 네이티브
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
    mode === "signup" ? (
      <>
        시그널카
        <br />
        가입하기
      </>
    ) : mode === "reset" ? (
      <>
        비밀번호
        <br />
        재설정
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
        <PageHeader backTo="/" backLabel="홈" eyebrow="Check email" title={<>메일을 확인해주세요</>} />
        <section className="px-5 mt-4 text-sm text-slate-600 space-y-3">
          <p>
            <strong className="text-[color:var(--color-brand-navy)]">{email}</strong> 으로 안내
            메일을 보냈어요.
          </p>
          <p>메일 속 링크를 누르면 {mode === "reset" ? "새 비밀번호를 설정" : "가입이 완료"}돼요.</p>
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
        subtitle="관심 차량 저장, 내 계약 공유, 협상 리포트는 로그인이 필요해요."
      />

      <section className="px-5 mt-4">
        {mode !== "reset" && (
          <>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full rounded-2xl bg-white border border-slate-200 py-3.5 font-semibold text-[14px] text-[color:var(--color-brand-navy)] shadow-sm active:scale-[0.99] transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />
              Google로 계속하기
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400">또는 이메일</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}

        <form onSubmit={handleEmail} className="space-y-2.5">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] border-0 outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/30"
          />
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
                <Mail className="h-4 w-4" /> {mode === "signin" ? "로그인" : "가입하기"}
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
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-[12.5px] text-slate-500 py-1"
          >
            {mode === "signin" ? "계정이 없어요 · 가입하기" : "이미 계정이 있어요 · 로그인"}
          </button>
        </div>

        <p className="mt-6 text-[11px] text-slate-400 text-center leading-relaxed">
          계속하면{" "}
          <Link to="/terms" className="underline">
            이용약관
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="underline">
            개인정보처리방침
          </Link>
          에 동의하는 것으로 간주해요.
        </p>
      </section>
    </ConsumerShell>
  );
}
