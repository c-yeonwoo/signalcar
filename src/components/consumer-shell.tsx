import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, MessageCircle, User } from "lucide-react";
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
    <div className="min-h-screen w-full bg-slate-200/50 flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-[color:var(--color-app-bg)] relative flex flex-col shadow-[0_0_60px_rgba(18,32,58,0.08)]">
        <div className={`flex-1 ${hideTabs ? "pb-8" : "pb-24"}`}>{children}</div>
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