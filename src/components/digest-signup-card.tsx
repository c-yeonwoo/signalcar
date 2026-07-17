import { useEffect, useState } from "react";
import { Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

const LOCAL_KEY = "sc.digestSignup.v1";

function readLocal(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
}

function writeLocal(email: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, email);
  window.dispatchEvent(new CustomEvent("sc:digest-signup-change"));
}

export function hasDigestSignup(): boolean {
  return Boolean(readLocal());
}

/**
 * 주간 시그널 이메일 다이제스트 구독 (발송 인프라는 Sprint K).
 * Gate J': 이메일 캡처 + digest_signups 테이블 best-effort insert.
 */
export function DigestSignupCard({ compact }: { compact?: boolean }) {
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setDone(hasDigestSignup());
    sync();
    if (user?.email && !readLocal()) setEmail(user.email);
    window.addEventListener("sc:digest-signup-change", sync);
    return () => window.removeEventListener("sc:digest-signup-change", sync);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("이메일 주소를 확인해 주세요");
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("digest_signups").insert({
        email: v,
        user_id: user?.id ?? null,
      });
      if (error) {
        console.warn("[digest]", error.message);
      }
      writeLocal(v);
      setDone(true);
      toast.success("주간 시그널 메일 명단에 담았어요");
    } catch (err) {
      writeLocal(v);
      setDone(true);
      toast.success("명단에 담았어요 · 발송 준비되면 보내드릴게요");
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className={`rounded-2xl border border-[color:var(--color-brand-mist)] bg-white ${
          compact ? "p-3.5" : "p-4"
        } flex items-center gap-3`}
      >
        <div className="w-9 h-9 rounded-xl bg-[color:var(--color-signal-buy)]/10 grid place-items-center shrink-0">
          <Check className="h-4 w-4 text-[color:var(--color-signal-buy)]" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">
            주간 시그널 메일 등록됨
          </div>
          <div className="text-[11.5px] text-slate-500 mt-0.5">
            관심 차 변화가 있을 때 주 1회 보내드려요.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border border-[color:var(--color-brand-mist)] bg-white ${
        compact ? "p-3.5" : "p-4"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[color:var(--color-brand-navy)] grid place-items-center shrink-0">
          <Mail className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)]">
            주간 시그널 메일
          </div>
          <div className="text-[11.5px] text-slate-500 leading-snug">
            관심 차 다이제스트를 매주 받아보세요.
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--color-brand-blue)]"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 h-10 rounded-xl bg-[color:var(--color-brand-navy)] text-white px-3.5 text-[12.5px] font-semibold disabled:opacity-60"
        >
          {loading ? "…" : "받기"}
        </button>
      </div>
    </form>
  );
}
