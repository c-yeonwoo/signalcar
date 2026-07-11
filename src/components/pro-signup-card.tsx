import { useEffect, useState } from "react";
import { Crown, Check, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "sc.pro-signup.v1";

function readLocal(): { email: string; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSignedUpForPro() {
  return !!readLocal();
}

export function ProSignupCard({
  source,
  carId,
  variant = "full",
}: {
  source: string;
  carId?: string;
  variant?: "full" | "compact";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [existing, setExisting] = useState<string | null>(null);

  useEffect(() => {
    const prev = readLocal();
    if (prev) {
      setExisting(prev.email);
      setStatus("done");
    }
  }, []);

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast("이메일 주소를 확인해주세요");
      return;
    }
    setStatus("loading");
    const { data: sess } = await supabase.auth.getUser();
    const { error } = await supabase.from("pro_signups").insert({
      email: clean,
      source,
      car_id: carId ?? null,
      user_id: sess.user?.id ?? null,
    });
    if (error) {
      setStatus("idle");
      toast("잠시 후 다시 시도해주세요");
      return;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ email: clean, at: Date.now() }));
    } catch {
      /* noop */
    }
    setExisting(clean);
    setStatus("done");
    window.dispatchEvent(new Event("sc:pro-signup-change"));
    toast.success("얼리버드 명단에 담았어요");
  };

  if (status === "done" && existing) {
    return (
      <div className={`rounded-2xl ${variant === "full" ? "bg-[color:var(--color-brand-navy)] text-white p-5" : "bg-slate-50 border border-slate-100 p-4"}`}>
        <div className={`flex items-center gap-1.5 text-[11.5px] ${variant === "full" ? "opacity-80" : "text-slate-500"}`}>
          <Crown className="h-3.5 w-3.5" /> 코치 PRO 얼리버드
        </div>
        <div className={`mt-1.5 text-[14px] font-semibold ${variant === "full" ? "" : "text-[color:var(--color-brand-navy)]"} flex items-center gap-1.5`}>
          <Check className="h-4 w-4 text-[color:var(--color-signal-buy)]" />
          {existing} 로 등록됨
        </div>
        <div className={`text-[11.5px] mt-1 ${variant === "full" ? "opacity-75" : "text-slate-500"}`}>
          런칭 전 얼리버드가에 먼저 열어드릴게요.
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
          <Crown className="h-3.5 w-3.5" /> 코치 PRO 얼리버드
        </div>
        <div className="text-[13.5px] font-semibold text-[color:var(--color-brand-navy)] mt-1">
          런칭 알림 · 최대 50% 얼리버드가
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--color-brand-blue)]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl bg-[color:var(--color-brand-navy)] text-white px-4 text-[12.5px] font-semibold disabled:opacity-60"
          >
            {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "알림"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[color:var(--color-brand-navy)] to-slate-800 text-white p-5">
      <div className="flex items-center gap-1.5 text-[11.5px] opacity-80">
        <Crown className="h-3.5 w-3.5" /> 코치 PRO · 얼리버드 모집 중
      </div>
      <div className="text-[16px] font-bold mt-1.5 leading-snug">
        런칭 알림 받고 얼리버드가로 열어보세요
      </div>
      <div className="text-[12px] opacity-80 mt-1.5 leading-relaxed">
        딜러 첫 제시가 예측, 협상 스크립트, 저리 할부 실질금리 체크까지.
        <br />정식 오픈 전에 등록하면 얼리버드가로 먼저 열어드려요.
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-4 flex gap-2"
      >
        <div className="relative flex-1 min-w-0">
          <Mail className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full rounded-xl bg-white/95 px-3 pl-8 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-white text-[color:var(--color-brand-navy)] px-4 text-[13px] font-semibold disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "등록"}
        </button>
      </form>
      <div className="text-[10.5px] opacity-70 mt-2">
        마케팅 스팸 없이 런칭 알림만 보내드려요.
      </div>
    </div>
  );
}