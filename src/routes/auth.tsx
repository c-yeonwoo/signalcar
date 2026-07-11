import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ConsumerShell } from "@/components/consumer-shell";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  ssr: false,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 경우 홈으로
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fn =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            });
      const { error } = await fn;
      if (error) throw error;
      toast.success(mode === "signin" ? "환영해요" : "가입이 완료됐어요");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("구글 로그인에 실패했어요");
      setLoading(false);
      return;
    }
    if (!result.redirected) {
      navigate({ to: "/" });
    }
  };

  return (
    <ConsumerShell hideTabs>
      <header className="px-5 pt-6 pb-2">
        <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-slate-500">
          <ArrowLeft className="h-4 w-4" /> 나중에
        </Link>
        <h1 className="text-[26px] font-bold text-[color:var(--color-brand-navy)] leading-tight mt-6">
          시그널카에<br />로그인
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-2 leading-relaxed">
          로그인하면 관심 차종 저장, 실계약가 제보, 협상 브리핑 요청을 쓸 수 있어요.
        </p>
      </header>

      <section className="px-5 mt-4">
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

        <form onSubmit={handleEmail} className="space-y-2.5">
          <input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] border-0 outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/30"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 rounded-xl px-4 py-3.5 text-[14px] border-0 outline-none focus:ring-2 focus:ring-[color:var(--color-brand-blue)]/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[color:var(--color-brand-navy)] text-white py-3.5 font-semibold text-[15px] shadow-[0_10px_30px_rgba(18,32,58,0.2)] active:scale-[0.99] transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Mail className="h-4 w-4" /> {mode === "signin" ? "로그인" : "가입하기"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-[12.5px] text-slate-500 mt-3 py-1"
        >
          {mode === "signin" ? "계정이 없어요 · 가입하기" : "이미 계정이 있어요 · 로그인"}
        </button>
      </section>
    </ConsumerShell>
  );
}