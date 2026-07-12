import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, MessageCircle, User, Smartphone } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "홈", icon: Home, match: (p: string) => p === "/" || p.startsWith("/car") },
  { to: "/explore", label: "탐색", icon: Compass, match: (p: string) => p.startsWith("/explore") },
  { to: "/coach", label: "코치", icon: MessageCircle, match: (p: string) => p.startsWith("/coach") || p.startsWith("/diagnose") },
  { to: "/me", label: "마이", icon: User, match: (p: string) => p.startsWith("/me") || p.startsWith("/compare") || p.startsWith("/report") },
] as const;

export function ConsumerShell({ children, hideTabs = false }: { children: ReactNode; hideTabs?: boolean }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen w-full bg-slate-200/50 flex justify-center relative">
      {/* 데스크톱 안내: 640px 이상에서만 사이드에 표시 */}
      <aside className="hidden lg:block fixed left-6 top-6 max-w-[220px] text-slate-500">
        <div className="rounded-2xl bg-white/70 backdrop-blur border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--color-brand-navy)]">
            <Smartphone className="h-3.5 w-3.5" />
            모바일에 최적화됐어요
          </div>
          <p className="text-[11px] mt-1.5 leading-relaxed">
            시그널카는 모바일 화면에 맞춰 만들었어요. 폰으로 열면 더 편하게 볼 수 있어요.
          </p>
        </div>
      </aside>
      <div className="w-full max-w-[480px] min-h-screen bg-[color:var(--color-app-bg)] relative flex flex-col shadow-[0_0_60px_rgba(18,32,58,0.08)]">
        <div className={`flex-1 ${hideTabs ? "pb-8" : "pb-24"}`}>{children}</div>
        <footer className={`px-5 ${hideTabs ? "pb-6" : "pb-28"} pt-4 text-[10.5px] text-slate-400 flex items-center gap-3 justify-center`}>
          <Link to="/terms" className="hover:text-slate-600">이용약관</Link>
          <span className="text-slate-300">·</span>
          <Link to="/privacy" className="hover:text-slate-600">개인정보 처리방침</Link>
        </footer>
        {!hideTabs && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur border-t border-slate-100 pb-[env(safe-area-inset-bottom)] z-40">
          <ul className="grid grid-cols-4">
            {tabs.map((t) => {
              const active = t.match(pathname);
              return (
                <li key={t.to}>
                  <Link
                    to={t.to}
                    className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                      active ? "text-[color:var(--color-brand-blue)]" : "text-slate-400"
                    }`}
                  >
                    <t.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                    <span>{t.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        )}
      </div>
    </div>
  );
}