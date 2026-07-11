import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Wrench, HeartHandshake, LogIn, LogOut, User as UserIcon, Camera, ScanLine, ChevronRight } from "lucide-react";
import { ConsumerShell } from "@/components/consumer-shell";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/me")({
  component: MePage,
  ssr: false,
});

function MePage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃했어요");
    navigate({ to: "/auth" });
  };

  return (
    <ConsumerShell>
      <PageHeader eyebrow="마이 시그널카" title="내 정보" />
      <div className="px-5 -mt-1 pb-4">
        <div className="sc-card p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 grid place-items-center">
            <UserIcon className="h-6 w-6 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-bold text-[color:var(--color-brand-navy)] truncate">
              {loading ? "…" : user ? (user.email ?? "가입 유저") : "게스트"}
            </div>
            <div className="text-[12px] text-slate-500">
              {user ? "탐색 중 · 시그널 켜져 있어요" : "로그인하고 시그널카를 완전하게 써보세요"}
            </div>
          </div>
        </div>
      </div>

      {!user && !loading && (
        <section className="px-5 mb-6">
          <Link to="/auth" className="sc-btn-primary">
            <LogIn className="h-4 w-4" /> 로그인 / 가입하기
          </Link>
          <p className="text-[11.5px] text-slate-400 text-center mt-3">
            관심 차종·제보·협상 브리핑은 로그인이 필요해요.
          </p>
        </section>
      )}

      <section className="px-5 space-y-3">
        <ActionLink to="/report" icon={Camera} title="계약서 제보" desc="1건 제보하면 리포트 열람권을 드려요." />
        <ActionLink to="/diagnose" icon={ScanLine} title="견적서 진단" desc="딜러 견적서 함정 여부를 사진으로 체크." />
        <Placeholder icon={Clock} title="출고 트래킹" desc="계약 후 생산·배송·출고를 한눈에 볼 수 있어요." />
        <Placeholder icon={Wrench} title="차생활 관리" desc="첫 점검·소모품 교체 시점을 알려드려요." />
        <Placeholder icon={HeartHandshake} title="구매 히스토리" desc="내가 받은 브리핑과 진단 기록을 보관해요." />
      </section>

      {user && (
        <section className="px-5 mt-6">
          <button onClick={handleSignOut} className="sc-btn-ghost">
            <LogOut className="h-4 w-4" /> 로그아웃
          </button>
        </section>
      )}

      <p className="text-[11.5px] text-slate-400 text-center mt-8">시그널카 v0</p>
    </ConsumerShell>
  );
}

function Placeholder({ icon: Icon, title, desc }: { icon: typeof Clock; title: string; desc: string }) {
  return (
    <div className="sc-card p-5 flex gap-3 items-start opacity-90">
      <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center flex-shrink-0">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">{title}</div>
          <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">준비 중</span>
        </div>
        <div className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function ActionLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Clock;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to} className="sc-card p-5 flex gap-3 items-center active:scale-[0.99] transition">
      <div className="w-10 h-10 rounded-xl bg-[color:var(--color-brand-navy)]/6 grid place-items-center flex-shrink-0">
        <Icon className="h-5 w-5 text-[color:var(--color-brand-navy)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">{title}</div>
        <div className="text-[12.5px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}