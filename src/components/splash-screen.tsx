import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const SEEN_KEY = "signalcar_splash_seen_v1";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    setVisible(true);
    sessionStorage.setItem(SEEN_KEY, "1");
    const fadeT = window.setTimeout(() => setFading(true), 1400);
    const hideT = window.setTimeout(() => setVisible(false), 1900);
    return () => {
      window.clearTimeout(fadeT);
      window.clearTimeout(hideT);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(120% 80% at 50% 20%, #1a2f5a 0%, #0e1b36 55%, #08122a 100%)",
      }}
    >
      <div className="relative flex flex-col items-center">
        <div className="absolute -inset-10 rounded-full bg-[color:var(--color-brand-blue)]/25 blur-3xl animate-pulse" />
        <div className="relative rounded-3xl bg-white/95 p-5 shadow-[0_20px_60px_rgba(46,107,255,0.35)]">
          <img src={logo} alt="시그널카" width={72} height={72} className="h-16 w-16" />
        </div>
        <div className="mt-6 text-white text-[22px] font-bold tracking-tight">시그널카</div>
        <div className="mt-1 text-white/60 text-[12.5px]">지금 사도 될까? 신호로 알려드릴게요</div>

        <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 bg-[color:var(--color-brand-blue)] animate-[splash_1.4s_ease-in-out_infinite]" />
        </div>
      </div>
      <style>{`
        @keyframes splash {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}