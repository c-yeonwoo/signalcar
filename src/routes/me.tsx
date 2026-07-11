import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Wrench, HeartHandshake, LogIn, LogOut, User as UserIcon, Camera, ScanLine, ChevronRight, Heart, GitCompare, MessageSquareQuote, FileText, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { ConsumerShell } from "@/components/consumer-shell";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-kit";
import { getWatchlist } from "@/lib/watchlist-store";
import { getCompareList } from "@/lib/compare-store";
import { getMyReviews } from "@/lib/onboarding-store";
import { hasSignedUpForPro } from "@/components/pro-signup-card";

export const Route = createFileRoute("/me")({
  component: MePage,
  ssr: false,
});

function MePage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  const [counts, setCounts] = useState({ watch: 0, compare: 0, reviews: 0, reports: 0 });
  const [proSignedUp, setProSignedUp] = useState(false);
  useEffect(() => {
    const sync = () =>
      setCounts((c) => ({
        ...c,
        watch: getWatchlist().length,
        compare: getCompareList().length,
        reviews: getMyReviews().length,
      }));
    sync();
    const syncPro = () => setProSignedUp(hasSignedUpForPro());
    syncPro();
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:compare-change", sync);
    window.addEventListener("sc:reviews-change", sync);
    window.addEventListener("sc:pro-signup-change", syncPro);
    return () => {
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:compare-change", sync);
      window.removeEventListener("sc:reviews-change", sync);
      window.removeEventListener("sc:pro-signup-change", syncPro);
    };
  }, []);

  // 실 deal_reports 카운트 (로그인 유저만, RLS로 본인 것만 반환)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase
      .from("deal_reports")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (alive && typeof count === "number") setCounts((c) => ({ ...c, reports: count }));
      });
    return () => {
      alive = false;
    };
  }, [user]);

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

      {/* 나의 활동 허브 */}
      <section className="px-5 mb-5 grid grid-cols-2 gap-2.5">
        <HubCard to="/" icon={Heart} title="관심 차종" count={counts.watch} desc="홈에서 시그널 추적 중" />
        <HubCard to="/compare" icon={GitCompare} title="비교함" count={counts.compare} desc="최대 3대 나란히" />
        <HubCard to="/report" icon={FileText} title="내 제보" count={counts.reports} desc="계약서로 리포트 언락" />
        <HubCard to="/report" icon={MessageSquareQuote} title="내 리뷰" count={counts.reviews} desc="실오너 배지" />
      </section>

      {/* PRO 얼리버드 상태 */}
      <section className="px-5 mb-5">
        <Link
          to="/coach"
          className="sc-card p-4 flex items-center gap-3 active:scale-[0.99] transition"
        >
          <div className="w-10 h-10 rounded-xl bg-[color:var(--color-brand-navy)] grid place-items-center flex-shrink-0">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-[color:var(--color-brand-navy)]">
              코치 PRO 얼리버드
            </div>
            <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
              {proSignedUp
                ? "명단에 등록됨 · 런칭 시 얼리버드가로 알림"
                : "런칭 알림 받고 얼리버드가로 먼저 열기"}
            </div>
          </div>
          {proSignedUp ? (
            <span className="text-[11px] px-2 py-1 rounded-full bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)] font-semibold">
              등록됨
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </Link>
      </section>

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

function HubCard({
  to,
  icon: Icon,
  title,
  count,
  desc,
}: {
  to: string;
  icon: typeof Clock;
  title: string;
  count: number;
  desc: string;
}) {
  return (
    <Link to={to} className="sc-card p-3.5 active:scale-[0.99] transition">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--color-brand-navy)]/6 grid place-items-center">
          <Icon className="h-4 w-4 text-[color:var(--color-brand-navy)]" />
        </div>
        <div className="text-[18px] font-bold text-[color:var(--color-brand-navy)] tabular-nums leading-none">
          {count}
        </div>
      </div>
      <div className="text-[13px] font-semibold text-[color:var(--color-brand-navy)] mt-2.5">{title}</div>
      <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{desc}</div>
    </Link>
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