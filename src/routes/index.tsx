import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, ChevronRight, GitCompare, Camera, ScanLine, Heart, Check, Sparkles, TrendingDown, TrendingUp, Tag, Minus, Search, Bell, BellRing, Target, Bookmark, AlertTriangle, X, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConsumerShell } from "@/components/consumer-shell";
import { Sparkline } from "@/components/sparkline";
import { MOCK_CARS, formatKRW, weeklyChangeFor } from "@/lib/mock-cars";
import { SectionTitle, SignalPill, CarThumb, SampleSize } from "@/components/ui-kit";
import logo from "@/assets/logo.png";
import { OnboardingModal } from "@/components/onboarding-modal";
import { getWatchlist } from "@/lib/watchlist-store";
import { getCompareList, toggleCompare } from "@/lib/compare-store";
import { getPrefs } from "@/lib/onboarding-store";
import { DiscoveryCarousel } from "@/components/discovery-carousel";
import { NewsHero } from "@/components/news-hero";
import { WatchlistAddSheet } from "@/components/watchlist-add-sheet";
import { PriceAlertSheet } from "@/components/price-alert-sheet";
import { alertStatus, getAlerts, type PriceAlert } from "@/lib/alerts-store";
import { daysSince, getLastVisit, stampLastVisit } from "@/lib/last-visit";
import { getAllSnapshots, relativeAgo, type WatchSnapshot } from "@/lib/watch-snapshot";
import { computeTriggers, ackRise, getRiseState, setDefaultPct, setCarPct, type RiseTrigger } from "@/lib/rise-alerts";
import type { MockCar } from "@/lib/mock-cars";

export const Route = createFileRoute("/")({
  component: HomePage,
  ssr: false,
});

function HomePage() {
  const [watchIds, setWatchIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [alerts, setAlerts] = useState<Record<string, PriceAlert>>({});
  const [alertCar, setAlertCar] = useState<MockCar | null>(null);
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  const [snaps, setSnaps] = useState<Record<string, WatchSnapshot>>({});
  const [riseTick, setRiseTick] = useState(0);
  const [showThresholdSheet, setShowThresholdSheet] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    const sync = () => {
      const w = getWatchlist();
      setWatchIds(w);
      setCompareIds(getCompareList());
      setPersonalized(w.length === 0);
      setAlerts(getAlerts());
      setSnaps(getAllSnapshots());
    };
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:compare-change", sync);
    window.addEventListener("sc:prefs-change", sync);
    window.addEventListener("sc:alerts-change", sync);
    window.addEventListener("sc:watch-snapshot-change", sync);
    const bump = () => setRiseTick((n) => n + 1);
    window.addEventListener("sc:rise-alerts-change", bump);
    // "지난 방문 이후" 계산은 방문 스탬프를 갱신하기 전 값이어야 함
    setLastVisit(getLastVisit());
    stampLastVisit();
    return () => {
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:compare-change", sync);
      window.removeEventListener("sc:prefs-change", sync);
      window.removeEventListener("sc:alerts-change", sync);
      window.removeEventListener("sc:watch-snapshot-change", sync);
      window.removeEventListener("sc:rise-alerts-change", bump);
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

  const handleAlertOpen = (car: MockCar, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAlertCar(car);
  };

  // 관심차 다이제스트 요약
  const digest = (() => {
    if (watched.length === 0) return null;
    const withChange = watched
      .map((c) => ({ car: c, wk: weeklyChangeFor(c) }))
      .filter((x) => x.wk.direction !== "flat" || x.wk.promoRefreshed);
    if (withChange.length === 0) {
      return { quiet: true as const, count: watched.length };
    }
    return { quiet: false as const, count: watched.length, changed: withChange };
  })();

  const revisit = daysSince(lastVisit) >= 1 && lastVisit !== null;

  // 스냅샷 대비 임계값 이상 오른 관심차 계산 (인앱 배너)
  const riseTriggers: RiseTrigger[] = (() => {
    void riseTick;
    return computeTriggers(
      watched.map((c) => ({ id: c.id, price: c.medianContract, snapshot: snaps[c.id] ?? null })),
    );
  })();
  const riseState = (() => { void riseTick; return getRiseState(); })();

  return (
    <ConsumerShell>
      <OnboardingModal />
      <div className="px-5 pt-6 flex items-center gap-2">
        <img src={logo} alt="시그널카" width={24} height={24} className="h-6 w-6" />
        <span className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)] tracking-tight">시그널카</span>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">2026.07</span>
      </div>
      {/* 가격 상승 알림 — 재방문자에게, 스냅샷 대비 임계값 이상 오른 관심차가 있을 때만 */}
      {revisit && riseTriggers.length > 0 && (
        <section className="px-5 mt-4">
          <div className="rounded-2xl border border-[color:var(--color-signal-wait)]/40 bg-[color:var(--color-signal-wait-soft)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--color-signal-wait)] shrink-0" />
                <span className="text-[11px] font-bold text-[color:var(--color-signal-wait)] tracking-wide">
                  가격 상승 알림
                </span>
                <span className="text-[10.5px] text-slate-500 truncate">
                  · 기준 {riseState.defaultPct}%
                </span>
              </div>
              <button
                onClick={() => setShowThresholdSheet(true)}
                className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 border border-slate-200"
                aria-label="알림 기준 조정"
              >
                <Settings2 className="h-3 w-3" />
                조정
              </button>
            </div>
            <p className="mt-1.5 text-[12.5px] text-slate-700 leading-snug">
              담은 이후 {riseTriggers.length}대의 가격이 기준치 이상 올랐어요.
            </p>
            <ul className="mt-2 space-y-1.5">
              {riseTriggers.map((t) => {
                const car = watched.find((c) => c.id === t.carId);
                if (!car) return null;
                return (
                  <li
                    key={t.carId}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 border border-[color:var(--color-signal-wait)]/25"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold text-[color:var(--color-brand-navy)] truncate">
                        {car.model}
                      </div>
                      <div className="text-[10.5px] text-slate-500 tabular-nums">
                        {formatKRW(t.snapshotPrice)} → {formatKRW(t.currentPrice)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-signal-wait)] px-2 py-0.5 text-[10.5px] font-bold text-white tabular-nums">
                        <TrendingUp className="h-3 w-3" />
                        +{t.pct.toFixed(1)}%
                      </span>
                      <button
                        onClick={() => {
                          ackRise(t.carId, t.currentPrice);
                          toast.success("알림을 확인 처리했어요");
                        }}
                        aria-label="확인"
                        className="rounded-full p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10.5px] text-slate-500">
              푸시·이메일 알림은 곧 지원돼요. 지금은 방문 시 배너로 알려드려요.
            </p>
          </div>
        </section>
      )}

      {/* 알림 기준 조정 시트 */}
      {showThresholdSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/40 grid place-items-end"
          onClick={() => setShowThresholdSheet(false)}
        >
          <div
            className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <h3 className="text-[15px] font-bold text-[color:var(--color-brand-navy)]">가격 상승 알림 기준</h3>
            <p className="mt-1 text-[12px] text-slate-500 leading-snug">
              담은 시점 대비 몇 % 이상 오르면 알림을 띄울지 정해요.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[1, 2, 3, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setDefaultPct(p);
                    toast.success(`알림 기준 ${p}%로 저장했어요`);
                  }}
                  className={`rounded-xl border py-2.5 text-[13px] font-bold tabular-nums transition ${
                    riseState.defaultPct === p
                      ? "border-[color:var(--color-brand-blue)] bg-[color:var(--color-brand-blue)]/10 text-[color:var(--color-brand-blue)]"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
            {watched.length > 0 && (
              <div className="mt-5">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">차량별 개별 설정</div>
                <ul className="space-y-1.5 max-h-[240px] overflow-y-auto">
                  {watched.map((c) => {
                    const pct = riseState.perCar[c.id] ?? riseState.defaultPct;
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                        <span className="text-[12.5px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                          {c.model}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 5].map((p) => (
                            <button
                              key={p}
                              onClick={() => setCarPct(c.id, p)}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                                pct === p
                                  ? "bg-[color:var(--color-brand-navy)] text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <button
              onClick={() => setShowThresholdSheet(false)}
              className="mt-5 w-full rounded-xl bg-[color:var(--color-brand-navy)] py-3 text-[13.5px] font-bold text-white"
            >
              완료
            </button>
          </div>
        </div>
      )}

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
              오늘의 시그널 · 추천 {recommend.length}대
            </span>
          ) : (
            <>내 관심 차 ({recommend.length})</>
          )}
        </SectionTitle>

        {/* 관심차 있을 때: 한 줄 다이제스트 서브헤더 */}
        {!personalized && digest && (
          <div className="-mt-1 flex items-start gap-1.5 text-[11.5px] text-slate-500 leading-snug">
            <BellRing
              className={`h-3 w-3 mt-[3px] shrink-0 ${
                digest.quiet ? "text-slate-400" : "text-[color:var(--color-brand-blue)]"
              }`}
            />
            <span className="min-w-0">
              <span className="font-semibold text-slate-600">
                {revisit ? "지난 방문 이후" : "이번주"}:
              </span>{" "}
              {digest.quiet
                ? "유의미한 변화 없음, 조용해요."
                : digest.changed
                    .slice(0, 2)
                    .map(({ car, wk }) => `${car.model} ${wk.headline}`)
                    .join(" · ")}
            </span>
          </div>
        )}

        {personalized && (
          <div className="-mt-1 mb-2 space-y-2">
            <p className="text-[12px] text-slate-500">
              {prefs
                ? "온보딩에서 알려주신 취향을 바탕으로 골랐어요. 카드의 하트로 관심에 담아보세요."
                : "관심 있는 차의 하트를 눌러 담아두면, 매일 시그널을 알려드려요."}
            </p>
            <Link
              to="/explore"
              className="flex items-center justify-between rounded-xl bg-[color:var(--color-brand-blue)]/8 border border-[color:var(--color-brand-blue)]/20 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="h-4 w-4 text-[color:var(--color-brand-blue)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-[color:var(--color-brand-navy)]">전체 차량에서 찾기</div>
                  <div className="text-[10.5px] text-slate-500 truncate">브랜드·바디·연료로 필터해 하트로 담기</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[color:var(--color-brand-blue)] shrink-0" />
            </Link>
          </div>
        )}

        {recommend.map((c) => {
          const sparkColor =
            c.signal === "buy" ? "#16A34A" : c.signal === "wait" ? "#F59E0B" : "#64748B";
          const inCompare = compareIds.includes(c.id);
          const isWatched = watchIds.includes(c.id);
          const wk = weeklyChangeFor(c);
          const alert = alerts[c.id];
          const alertHit = alert ? alertStatus(c.medianContract, alert.targetPrice) : null;
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
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${wkTone}`}>
                    <WkIcon className="h-3 w-3" />
                    {wk.headline}
                  </div>
                  <button
                    onClick={(e) => handleAlertOpen(c, e)}
                    aria-label="목표가 알림 설정"
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold transition ${
                      alertHit?.hit
                        ? "bg-[color:var(--color-signal-buy)] text-white"
                        : alert
                          ? "bg-[color:var(--color-brand-blue)]/12 text-[color:var(--color-brand-blue)]"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {alertHit?.hit ? <Target className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                    {alertHit?.hit
                      ? "목표가 도달"
                      : alert
                        ? `${formatKRW(alert.targetPrice)} 목표`
                        : "목표가 알림"}
                  </button>
                </div>
              )}
              <div className="mb-4">
                <CarThumb
                  src={c.image}
                  alt={`${c.model} ${c.trim}`}
                  fallbackClassName={c.imageColor}
                />
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

              {isWatched && snaps[c.id] && (() => {
                const snap = snaps[c.id];
                const diff = c.medianContract - snap.price;
                const pct = snap.price > 0 ? (diff / snap.price) * 100 : 0;
                const same = Math.abs(diff) < 50_000; // 5만원 미만은 무의미
                const dir: "down" | "up" | "flat" = same ? "flat" : diff < 0 ? "down" : "up";
                const tone =
                  dir === "down"
                    ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
                    : dir === "up"
                      ? "bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]"
                      : "bg-slate-100 text-slate-500";
                const DirIcon = dir === "down" ? TrendingDown : dir === "up" ? TrendingUp : Minus;
                const abs = formatKRW(Math.abs(diff));
                const label =
                  dir === "flat"
                    ? "담은 시점과 동일"
                    : `담은 이후 ${abs} ${dir === "down" ? "↓" : "↑"} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
                return (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bookmark className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-[10.5px] text-slate-500 shrink-0">{relativeAgo(snap.at)} · {formatKRW(snap.price)}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
                      <DirIcon className="h-3 w-3" />
                      {label.replace(/담은 이후 /, "")}
                    </span>
                  </div>
                );
              })()}

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
          <Link to="/coach/options" className="text-[13px] text-[color:var(--color-brand-blue)] font-medium">
            AI 상담와 견적 뽑아보기 →
          </Link>
        </div>
      </section>

      {/* 신규 유저(관심차 없음): 하단 웰컴 카드로 신차 소식 큐레이션 노출 */}
      {personalized && (
        <section className="px-5 mt-6">
          <div className="sc-card p-4 bg-[color:var(--color-brand-blue)]/5 border-[color:var(--color-brand-blue)]/15">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-blue)]" />
              <span className="text-[11.5px] font-semibold text-[color:var(--color-brand-blue)] tracking-wide">
                시그널카에 오신 걸 환영해요
              </span>
            </div>
            <p className="text-[12.5px] text-slate-600 leading-snug mb-3">
              요즘 뜨는 신차 소식부터 훑어보세요. 마음에 드는 차는 하트로 담아두면 매일 시그널을 알려드려요.
            </p>
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[color:var(--color-brand-blue)] text-white py-2.5 text-[12.5px] font-bold active:scale-[0.99] transition mb-3"
            >
              <Plus className="h-3.5 w-3.5" />
              내 관심 차 추가
            </button>
            <NewsHero />
          </div>
        </section>
      )}

      {/* 발견 — 구경하다 담기 */}
      <DiscoveryCarousel />

      {/* 폴백/디스커버리 — 관심 차 외에도 다른 차들을 훑을 수 있게 */}
      <section className="px-5 mt-6">
        <Link
          to="/explore"
          className="flex items-center gap-3 sc-card p-4 active:scale-[0.99] transition"
        >
          <div className="h-10 w-10 rounded-xl bg-[color:var(--color-brand-navy)]/6 grid place-items-center flex-shrink-0">
            <Search className="h-5 w-5 text-[color:var(--color-brand-navy)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-[color:var(--color-brand-navy)]">
              다른 차 둘러보기
            </div>
            <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
              판매 순위·세그먼트·브랜드로 후보 찾기
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </section>

      {/* 액션 진입 — 제보/진단 (탭에서 빠졌으니 홈에서 접근 확보) */}
      <section className="px-5 mt-5 grid grid-cols-2 gap-2.5">
        <Link to="/report" className="sc-card p-3.5 active:scale-[0.99] transition">
          <Camera className="h-4 w-4 text-[color:var(--color-brand-blue)]" />
          <div className="flex items-center gap-1.5 mt-2">
            <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)]">계약서 공유</div>
            <span className="text-[9.5px] font-bold bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)] rounded-full px-1.5 py-[1px]">
              +1 열람권
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            내 계약 1건 = 어느 차종에나 쓰는 협상 리포트
          </div>
        </Link>
        <Link to="/diagnose" className="sc-card p-3.5 active:scale-[0.99] transition">
          <ScanLine className="h-4 w-4 text-[color:var(--color-brand-blue)]" />
          <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] mt-2">견적서 진단</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">사진 한 장으로 함정 체크</div>
        </Link>
      </section>
      <div className="h-6" />
      {alertCar && (
        <PriceAlertSheet
          car={alertCar}
          open={!!alertCar}
          onOpenChange={(v) => { if (!v) setAlertCar(null); }}
        />
      )}
      <WatchlistAddSheet open={showAddSheet} onOpenChange={setShowAddSheet} />
    </ConsumerShell>
  );
}