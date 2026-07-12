import { Bookmark, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";
import { formatKRW } from "@/lib/mock-cars";
import { getSnapshot, relativeAgo, type WatchSnapshot } from "@/lib/watch-snapshot";
import { getThresholdPct } from "@/lib/rise-alerts";
import { useEffect, useState } from "react";

type Variant = "row" | "inline" | "hero";

export function SnapshotBadge({
  carId,
  currentPrice,
  variant = "row",
}: {
  carId: string;
  currentPrice: number;
  variant?: Variant;
}) {
  const hydrated = useHydrated();
  const [snap, setSnap] = useState<WatchSnapshot | null>(null);
  const [threshold, setThreshold] = useState<number>(0);

  useEffect(() => {
    const sync = () => {
      setSnap(getSnapshot(carId));
      setThreshold(getThresholdPct(carId));
    };
    sync();
    window.addEventListener("sc:watch-snapshot-change", sync);
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:rise-alerts-change", sync);
    return () => {
      window.removeEventListener("sc:watch-snapshot-change", sync);
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:rise-alerts-change", sync);
    };
  }, [carId]);

  if (!hydrated || !snap) return null;

  const diff = currentPrice - snap.price;
  const pct = snap.price > 0 ? (diff / snap.price) * 100 : 0;
  const same = Math.abs(diff) < 50_000;
  const dir: "down" | "up" | "flat" = same ? "flat" : diff < 0 ? "down" : "up";
  const breached = dir === "up" && pct >= threshold;

  const tone =
    breached
      ? "bg-[color:var(--color-signal-wait)] text-white"
      : dir === "down"
        ? "bg-[color:var(--color-signal-buy-soft)] text-[color:var(--color-signal-buy)]"
        : dir === "up"
          ? "bg-[color:var(--color-signal-wait-soft)] text-[color:var(--color-signal-wait)]"
          : "bg-slate-100 text-slate-500";
  const DirIcon = dir === "down" ? TrendingDown : dir === "up" ? TrendingUp : Minus;
  const abs = formatKRW(Math.abs(diff));
  const deltaText =
    dir === "flat"
      ? "동일"
      : `${abs} ${dir === "down" ? "↓" : "↑"} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
        <DirIcon className="h-3 w-3" />
        {deltaText}
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Bookmark className="h-3 w-3 text-slate-400" />
          담은 시점 가격 · {relativeAgo(snap.at)}
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div className="text-[15px] font-bold text-[color:var(--color-brand-navy)] tabular-nums">
            {formatKRW(snap.price)}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${tone}`}>
            <DirIcon className="h-3 w-3" />
            {deltaText}
          </span>
        </div>
        {breached && (
          <p className="mt-1.5 text-[10.5px] font-semibold text-[color:var(--color-signal-wait)]">
            알림 기준 {threshold}% 초과 · 가격 상승 알림
          </p>
        )}
      </div>
    );
  }

  // row
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Bookmark className="h-3 w-3 text-slate-400 shrink-0" />
        <span className="text-[10.5px] text-slate-500 truncate">
          {relativeAgo(snap.at)} · {formatKRW(snap.price)}
        </span>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tone}`}>
        <DirIcon className="h-3 w-3" />
        {deltaText}
      </span>
    </div>
  );
}
