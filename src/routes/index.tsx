import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, GitCompare, Camera, ScanLine, Map, Check, Sparkles, TrendingDown, TrendingUp, Tag, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { MOCK_CARS, formatKRW, weeklyChangeFor } from "@/lib/mock-cars";
import { PageHeader, SectionTitle, SignalPill, CarThumb, SampleSize } from "@/components/ui-kit";
import logo from "@/assets/logo.png";
import { OnboardingModal } from "@/components/onboarding-modal";
import { getWatchlist } from "@/lib/watchlist-store";
import { getCompareList, toggleCompare } from "@/lib/compare-store";
import { getPrefs } from "@/lib/onboarding-store";

export const Route = createFileRoute("/")({
  component: HomePage,
  ssr: false,
});

function HomePage() {
  const [watchIds, setWatchIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    const sync = () => {
      const w = getWatchlist();
      setWatchIds(w);
      setCompareIds(getCompareList());
      setPersonalized(w.length === 0);
    };
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:compare-change", sync);
    window.addEventListener("sc:prefs-change", sync);
    return () => {
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:compare-change", sync);
      window.removeEventListener("sc:prefs-change", sync);
    };
  }, []);

  // 워치리스트 있으면 그것만, 없으면 온보딩 취향 기반 추천 3대
  const prefs = getPrefs();
  const watched = watchIds
    .map((id) => MOCK_CARS.find((c) => c.id === id))
    .filter((c): c is (typeof MOCK_CARS)[number] => !!c);
  const recommend = (() => {
    if (watched.length > 0) return watched;
    if (!prefs) return MOCK_CARS.slice(0, 3);
    // 아주 러프한 취향 정렬 데모
    const familyish = prefs.purpose === "family" || prefs.purpose === "leisure";
    return [...MOCK_CARS]
      .sort((a, b) => {
        const aScore = (familyish && a.bodyType.includes("SUV") ? 2 : 0) + (a.signal === "buy" ? 1 : 0);
        const bScore = (familyish && b.bodyType.includes("SUV") ? 2 : 0) + (b.signal === "buy" ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 3);
  })();

  const handleCompareToggle = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { added, list } = toggleCompare(id);
    setCompareIds(list);
    toast.success(added ? "비교함에 담았어요" : "비교함에서 뺐어요");
  };

  return (
    <ConsumerShell>
      <OnboardingModal />
      <div className="px-5 pt-6 flex items-center gap-2">
        <img src={logo} alt="시그널카" width={24} height={24} className="h-6 w-6" />
        <span className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)] tracking-tight">시그널카</span>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">2026.07</span>
      </div>
      <PageHeader
        eyebrow="오늘의 시그널"
        title={<>어떤 차,<br />보고 계세요?</>}
        subtitle="관심 차종의 실거래·프로모션·타이밍을 매일 갱신해드려요."
      />
      <div className="px-5">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-[12.5px] font-medium text-slate-600 shadow-sm active:scale-[0.98] transition"
        >
          <Plus className="h-3.5 w-3.5" /> 관심 차종 추가
        </Link>
      </div>

      <section className="px-5 mt-5 space-y-3">
        <SectionTitle
          right={
            <Link
              to="/compare"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--color-brand-blue)]"
            >
              <GitCompare className="h-3 w-3" /> 비교함 {compareIds.length > 0 && `(${compareIds.length})`}
            </Link>
          }
        >
          {personalized ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-blue)]" />
              취향 기반 추천
            </span>
          ) : (
            <>관심 차종 {recommend.length}</>
          )}
        </SectionTitle>

        {personalized && (
          <p className="text-[12px] text-slate-500 -mt-1 mb-1">
            {prefs
              ? "온보딩에서 알려주신 취향을 바탕으로 골랐어요. 마음에 드는 차를 관심에 담아보세요."
              : "먼저 관심 있는 차를 담아보세요. 시장에서 가장 뜨거운 3대를 추천해드릴게요."}
          </p>
        )}

        {recommend.map((c) => {
          const sparkColor =
            c.signal === "buy" ? "#16A34A" : c.signal === "wait" ? "#F59E0B" : "#64748B";
          const inCompare = compareIds.includes(c.id);
          const isWatched = watchIds.includes(c.id);
          const wk = weeklyChangeFor(c);
          const wkTone =
            wk.direction === "down"
              ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
              : wk.direction === "up"
                ? "bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]"
                : wk.promoRefreshed
                  ? "bg-[color:var(--color-brand-blue)]/10 text-[color:var(--color-brand-blue)]"
                  : "bg-slate-100 text-slate-500";
          const WkIcon =
            wk.direction === "down"
              ? TrendingDown
              : wk.direction === "up"
                ? TrendingUp
                : wk.promoRefreshed
                  ? Tag
                  : Minus;
          return (
            <Link
              key={c.id}
              to="/car/$vehicleId"
              params={{ vehicleId: c.id }}
              className="block sc-card p-5 active:scale-[0.99] transition"
            >
              {isWatched && (
                <div className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${wkTone}`}>
                  <WkIcon className="h-3 w-3" />
                  {wk.headline}
                </div>
              )}
              <div className="mb-4">
                <CarThumb src={c.image} alt={`${c.model} ${c.trim}`} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-slate-500">{c.brand} · {c.bodyType}</div>
                  <div className="text-[17px] font-bold text-[color:var(--color-brand-navy)] mt-0.5 truncate">
                    {c.model}
                  </div>
                  <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{c.trim}</div>
                </div>
                <SignalPill signal={c.signal} />
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-500">실거래가 중앙값</div>
                  <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)] leading-none mt-1 tabular-nums">
                    {formatKRW(c.medianContract)}
                  </div>
                  <SampleSize count={c.reports} className="mt-1.5" />
                </div>
                <Sparkline values={c.history} color={sparkColor} width={110} height={44} />
              </div>

              <div
                className="mt-4 rounded-xl bg-slate-50 pl-3 pr-3 py-2.5 text-[12.5px] leading-snug text-slate-700 border-l-2"
                style={{ borderColor: sparkColor }}
              >
                {c.coach}
              </div>

              <div className="mt-3 flex items-center justify-between text-[12px]">
                <button
                  onClick={(e) => handleCompareToggle(c.id, e)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    inCompare
                      ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {inCompare ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  비교
                </button>
                <span className="inline-flex items-center gap-0.5 text-slate-400">
                  자세히 보기 <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}

        <div className="pt-2 pb-4 text-center">
          <Link to="/coach" className="text-[13px] text-[color:var(--color-brand-blue)] font-medium">
            AI 코치와 견적 뽑아보기 →
          </Link>
        </div>
      </section>

      {/* 폴백/디스커버리 — 관심 차 외에도 시장 전반을 훑을 수 있게 */}
      {/* 시장 지도 진입 — 홈은 "내 시그널", 탐색은 "시장 전체"로 역할 분리 */}
      <section className="px-5 mt-6">
        <Link
          to="/explore"
          className="flex items-center gap-3 sc-card p-4 active:scale-[0.99] transition"
        >
          <div className="h-10 w-10 rounded-xl bg-[color:var(--color-brand-navy)]/6 grid place-items-center flex-shrink-0">
            <Map className="h-5 w-5 text-[color:var(--color-brand-navy)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)]">
              시장 전체 지도 보기
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
              세그먼트·가격대·판매 TOP10·브랜드까지 한눈에
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* 액션 진입 — 제보/진단 (탭에서 빠졌으니 홈에서 접근 확보) */}
      <section className="px-5 mt-5 grid grid-cols-2 gap-2.5">
        <Link to="/report" className="sc-card p-3.5 active:scale-[0.99] transition">
          <Camera className="h-4 w-4 text-[color:var(--color-brand-blue)]" />
          <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] mt-2">계약서 제보</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">1건 제보 → 리포트 열람권</div>
        </Link>
        <Link to="/diagnose" className="sc-card p-3.5 active:scale-[0.99] transition">
          <ScanLine className="h-4 w-4 text-[color:var(--color-brand-blue)]" />
          <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] mt-2">견적서 진단</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">사진 한 장으로 함정 체크</div>
        </Link>
      </section>
      <div className="h-6" />
    </ConsumerShell>
  );
}