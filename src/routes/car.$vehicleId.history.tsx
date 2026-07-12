import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, TrendingDown, TrendingUp, Minus, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { ConsumerShell } from "@/components/consumer-shell";
import { PageHeader } from "@/components/ui-kit";
import { findCar, formatKRW } from "@/lib/mock-cars";
import { getSnapshot, relativeAgo, type WatchSnapshot } from "@/lib/watch-snapshot";
import { getThresholdPct } from "@/lib/rise-alerts";

export const Route = createFileRoute("/car/$vehicleId/history")({
  component: HistoryPage,
  ssr: false,
  loader: ({ params }) => {
    const car = findCar(params.vehicleId);
    if (!car) throw notFound();
    return { car };
  },
  notFoundComponent: () => (
    <ConsumerShell>
      <div className="p-10 text-center text-slate-500">차종을 찾을 수 없어요.</div>
    </ConsumerShell>
  ),
});

/**
 * 담은 시점 이후 프로모션/할인 변동 히스토리.
 * - mock-cars.history 는 최근 6개월 중앙값(만원 단위)
 * - 프로모션 할인액 = listPrice - median (원)
 * - 스냅샷 이후 델타를 라인차트 + 월별 표로 표시
 */
function HistoryPage() {
  const { car } = Route.useLoaderData();
  const [snap, setSnap] = useState<WatchSnapshot | null>(null);
  const [threshold, setThreshold] = useState<number>(2);

  useEffect(() => {
    const sync = () => {
      setSnap(getSnapshot(car.id));
      setThreshold(getThresholdPct(car.id));
    };
    sync();
    window.addEventListener("sc:watch-snapshot-change", sync);
    window.addEventListener("sc:rise-alerts-change", sync);
    return () => {
      window.removeEventListener("sc:watch-snapshot-change", sync);
      window.removeEventListener("sc:rise-alerts-change", sync);
    };
  }, [car.id]);

  // 월별 시계열 (오래된 → 최근). history[i]는 만원 단위 → 원 변환.
  const now = new Date();
  const points = car.history.map((v, i) => {
    const monthsAgo = car.history.length - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const median = v * 10_000;
    const discount = Math.max(0, car.listPrice - median);
    return {
      idx: i,
      label: `${d.getMonth() + 1}월`,
      date: d,
      median,
      discount,
      pct: (discount / car.listPrice) * 100,
    };
  });

  // 스냅샷 시점 인덱스 (월 기준 근사)
  let snapIdx: number | null = null;
  if (snap) {
    const snapDate = new Date(snap.at);
    const monthsFromFirst =
      (snapDate.getFullYear() - points[0].date.getFullYear()) * 12 +
      (snapDate.getMonth() - points[0].date.getMonth());
    snapIdx = Math.max(0, Math.min(points.length - 1, monthsFromFirst));
  }

  const current = points[points.length - 1];
  const snapPoint = snapIdx != null ? points[snapIdx] : null;
  const deltaDiscount = snapPoint ? current.discount - snapPoint.discount : 0;
  const deltaPct = snapPoint ? current.pct - snapPoint.pct : 0;
  const priceDelta = snap ? current.median - snap.price : 0;
  const priceDeltaPct = snap && snap.price > 0 ? (priceDelta / snap.price) * 100 : 0;
  const breached = snap ? priceDeltaPct >= threshold : false;

  return (
    <ConsumerShell>
      <div className="px-5 pt-5 pb-1">
        <Link
          to="/car/$vehicleId"
          params={{ vehicleId: car.id }}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {car.model}
        </Link>
      </div>
      <PageHeader
        eyebrow="가격·프로모션 히스토리"
        title="담은 시점 이후 변동"
        subtitle={
          snap
            ? `${relativeAgo(snap.at)} · 저장가 ${formatKRW(snap.price)}`
            : "이 차를 관심 담기하면 담은 시점 가격이 저장돼요."
        }
      />

      {/* Snapshot summary */}
      <section className="px-5">
        {snap ? (
          <div className="sc-card p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Bookmark className="h-3 w-3 text-slate-400" /> 담은 시점 대비 현재가
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div>
                <div className="text-[22px] font-bold text-[color:var(--color-brand-navy)] tabular-nums">
                  {formatKRW(current.median)}
                </div>
                <div className="text-[11.5px] text-slate-500 tabular-nums mt-0.5">
                  담은 시점 {formatKRW(snap.price)}
                </div>
              </div>
              <DeltaBadge diff={priceDelta} pct={priceDeltaPct} big />
            </div>
            {breached && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[color:var(--color-signal-wait-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--color-signal-wait)]">
                <Bell className="h-3 w-3" /> 알림 기준 {threshold}% 초과
              </div>
            )}
          </div>
        ) : (
          <div className="sc-card p-4 text-[12.5px] text-slate-500 leading-relaxed">
            아직 담은 시점 가격이 없어요.{" "}
            <Link
              to="/car/$vehicleId"
              params={{ vehicleId: car.id }}
              className="text-[color:var(--color-brand-navy)] font-semibold underline"
            >
              차량 상세
            </Link>
            에서 관심 담기를 눌러 스냅샷을 저장하면 이후 변동을 여기서 볼 수 있어요.
          </div>
        )}
      </section>

      {/* Chart */}
      <section className="px-5 mt-5">
        <div className="sc-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)]">
              프로모션·실거래 라인
            </div>
            <div className="flex items-center gap-3 text-[10.5px] text-slate-500">
              <LegendDot color="var(--color-brand-navy)" label="실거래 중앙값" />
              <LegendDot color="#16A34A" label="프로모션 할인" dashed />
            </div>
          </div>
          <DualLineChart points={points} snapIdx={snapIdx} />
        </div>
      </section>

      {/* Monthly table */}
      <section className="px-5 mt-5 mb-6">
        <div className="sc-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1.2fr_1.2fr_0.9fr] px-3 py-2 bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
            <div>월</div>
            <div className="text-right">실거래 중앙</div>
            <div className="text-right">프로모션</div>
            <div className="text-right">할인율</div>
          </div>
          <div className="divide-y divide-slate-100">
            {[...points].reverse().map((p) => {
              const isSnap = snapIdx != null && p.idx === snapIdx;
              const isNow = p.idx === points.length - 1;
              return (
                <div
                  key={p.idx}
                  className={`grid grid-cols-[1fr_1.2fr_1.2fr_0.9fr] px-3 py-2.5 text-[12.5px] tabular-nums ${
                    isNow ? "bg-[color:var(--color-brand-navy)]/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={isNow ? "font-bold text-[color:var(--color-brand-navy)]" : ""}>{p.label}</span>
                    {isSnap && (
                      <span className="text-[9.5px] bg-slate-200 text-slate-600 rounded px-1 py-[1px] font-semibold">
                        담음
                      </span>
                    )}
                    {isNow && (
                      <span className="text-[9.5px] bg-[color:var(--color-brand-navy)] text-white rounded px-1 py-[1px] font-semibold">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[color:var(--color-brand-navy)] font-semibold">
                    {formatKRW(p.median)}
                  </div>
                  <div className="text-right text-[color:var(--color-signal-buy)] font-semibold">
                    −{formatKRW(p.discount)}
                  </div>
                  <div className="text-right text-slate-600">−{p.pct.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {snapPoint && (
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed px-1">
            담은 시점({snapPoint.label}) 이후 프로모션은{" "}
            <span
              className={
                deltaDiscount >= 0
                  ? "text-[color:var(--color-signal-buy)] font-semibold"
                  : "text-[color:var(--color-signal-wait)] font-semibold"
              }
            >
              {deltaDiscount >= 0 ? "+" : "−"}
              {formatKRW(Math.abs(deltaDiscount))} ({deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(1)}%p)
            </span>{" "}
            변동했어요.
          </p>
        )}
      </section>
    </ConsumerShell>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="14" height="6">
        <line
          x1="0"
          y1="3"
          x2="14"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 2" : "0"}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

function DeltaBadge({ diff, pct, big }: { diff: number; pct: number; big?: boolean }) {
  const same = Math.abs(diff) < 50_000;
  const dir: "down" | "up" | "flat" = same ? "flat" : diff < 0 ? "down" : "up";
  const Icon = dir === "down" ? TrendingDown : dir === "up" ? TrendingUp : Minus;
  const tone =
    dir === "down"
      ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
      : dir === "up"
        ? "bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]"
        : "bg-slate-100 text-slate-500";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${tone} ${
        big ? "px-3 py-1.5 text-[13px]" : "px-2 py-0.5 text-[10.5px]"
      }`}
    >
      <Icon className={big ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {same
        ? "동일"
        : `${formatKRW(Math.abs(diff))} ${dir === "down" ? "↓" : "↑"} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`}
    </span>
  );
}

function DualLineChart({
  points,
  snapIdx,
}: {
  points: { idx: number; label: string; median: number; discount: number }[];
  snapIdx: number | null;
}) {
  const W = 340;
  const H = 160;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 10;
  const PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xs = (i: number) => PAD_L + (i / (points.length - 1)) * innerW;
  const mkY = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return (v: number) => PAD_T + innerH - ((v - min) / range) * innerH;
  };
  const yMedian = mkY(points.map((p) => p.median));
  const yDiscount = mkY(points.map((p) => p.discount));

  const linePath = (get: (p: (typeof points)[number]) => number) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${get(p).toFixed(1)}`)
      .join(" ");

  const medianD = linePath((p) => yMedian(p.median));
  const discountD = linePath((p) => yDiscount(p.discount));

  const lastMedian = points[points.length - 1];
  const lastDiscount = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
      {/* baseline */}
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={PAD_T + innerH}
        y2={PAD_T + innerH}
        stroke="#e2e8f0"
        strokeWidth="1"
      />

      {/* snapshot marker */}
      {snapIdx != null && (
        <>
          <line
            x1={xs(snapIdx)}
            x2={xs(snapIdx)}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <rect
            x={xs(snapIdx) - 14}
            y={PAD_T - 2}
            width="28"
            height="12"
            rx="3"
            fill="#475569"
          />
          <text
            x={xs(snapIdx)}
            y={PAD_T + 7}
            textAnchor="middle"
            fill="white"
            fontSize="8.5"
            fontWeight="700"
          >
            담음
          </text>
        </>
      )}

      {/* median line */}
      <path d={medianD} fill="none" stroke="var(--color-brand-navy)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* discount line (dashed) */}
      <path d={discountD} fill="none" stroke="#16A34A" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />

      {/* endpoint dots */}
      <circle cx={xs(points.length - 1)} cy={yMedian(lastMedian.median)} r="3.5" fill="var(--color-brand-navy)" />
      <circle cx={xs(points.length - 1)} cy={yDiscount(lastDiscount.discount)} r="3.5" fill="#16A34A" />

      {/* x labels */}
      {points.map((p, i) => (
        <text
          key={p.idx}
          x={xs(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize="9.5"
          fill="#64748b"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}