import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { formatKRW, type MockCar } from "@/lib/mock-cars";
import { fetchCarsFromDb } from "@/lib/cars";
import { SignalPill } from "@/components/ui-kit";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";
import { useEffect, useMemo, useState } from "react";

/** BUY 시그널 + 표본 많은 순 TOP N */
export function buySignalTop(cars: MockCar[], limit = 5): MockCar[] {
  return [...cars]
    .filter((c) => c.signal === "buy")
    .sort((a, b) => b.reports - a.reports || b.promoPercentile - a.promoPercentile)
    .slice(0, limit);
}

/**
 * 탐색 상단: 이번주 시그널 좋은 차 TOP 5
 */
export function SignalTopStrip({ limit = 5 }: { limit?: number }) {
  const { data: allCars = [] } = useQuery({
    queryKey: ["cars"],
    queryFn: () => fetchCarsFromDb(),
  });
  const [watched, setWatched] = useState<string[]>([]);
  const items = useMemo(() => buySignalTop(allCars, limit), [allCars, limit]);

  useEffect(() => {
    const sync = () => setWatched(getWatchlist());
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    return () => window.removeEventListener("sc:watchlist-change", sync);
  }, []);

  if (items.length === 0) return null;

  const onHeart = (e: React.MouseEvent, car: MockCar) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(car.id, { price: car.medianContract });
    setWatched(getWatchlist());
    toast.success(added ? `${car.model} 관심 담음` : `${car.model} 관심 해제`);
  };

  return (
    <section className="px-5 mt-4">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)]">
            이번주 시그널 좋은 차 TOP {items.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">BUY 시그널 · 표본 많은 순</div>
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((car, i) => {
          const isWatched = watched.includes(car.id);
          return (
            <Link
              key={car.id}
              to="/car/$vehicleId"
              params={{ vehicleId: car.id }}
              className="shrink-0 w-[148px] rounded-2xl bg-white border border-slate-100 p-3 active:scale-[0.99] transition"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-400 tabular-nums">#{i + 1}</span>
                <button
                  type="button"
                  onClick={(e) => onHeart(e, car)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={isWatched ? "관심 해제" : "관심 담기"}
                  className={`h-8 w-8 -mr-1 -mt-1 rounded-full grid place-items-center touch-manipulation ${
                    isWatched
                      ? "text-[color:var(--color-signal-buy)] bg-[color:var(--color-signal-buy)]/10"
                      : "text-slate-400 bg-slate-50"
                  }`}
                >
                  <Heart className="h-3.5 w-3.5" fill={isWatched ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">{car.brand}</div>
              <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] truncate leading-tight">
                {car.model}
              </div>
              <div className="mt-1.5">
                <SignalPill signal={car.signal} size="sm" />
              </div>
              <div className="mt-2 text-[12px] font-extrabold text-[color:var(--color-brand-navy)] tabular-nums">
                {formatKRW(car.medianContract)}
              </div>
              <div className="text-[10px] text-slate-400">표본 {car.reports}건</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
