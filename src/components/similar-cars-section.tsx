import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatKRW, type MockCar } from "@/lib/mock-cars";
import { similarTo } from "@/lib/recommend";
import { SignalPill } from "@/components/ui-kit";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";

/** 상세 하단: 이 차를 본 사람들이 함께 본 차 */
export function SimilarCarsSection({ car }: { car: MockCar }) {
  const [watched, setWatched] = useState<string[]>([]);
  const items = similarTo(car, 3);

  useEffect(() => {
    const sync = () => setWatched(getWatchlist());
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    return () => window.removeEventListener("sc:watchlist-change", sync);
  }, []);

  if (items.length === 0) return null;

  const onHeart = (e: React.MouseEvent, c: MockCar) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(c.id, { price: c.medianContract });
    setWatched(getWatchlist());
    toast.success(added ? `${c.model} 관심 담음` : `${c.model} 관심 해제`);
  };

  return (
    <section className="bg-white px-5 py-6 border-t border-[color:var(--color-brand-mist)]">
      <h3 className="text-[15px] font-bold text-[color:var(--color-brand-navy)]">
        이 차를 본 사람들이 함께 본 차
      </h3>
      <p className="text-[11.5px] text-slate-500 mt-1">같은 세그먼트·가격대 ±10% 후보</p>
      <ul className="mt-4 space-y-2.5">
        {items.map(({ car: c, reason }) => {
          const isWatched = watched.includes(c.id);
          return (
            <li key={c.id}>
              <Link
                to="/car/$vehicleId"
                params={{ vehicleId: c.id }}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-brand-mist)] bg-white p-3 active:scale-[0.99] transition"
              >
                <div
                  className={`h-12 w-14 rounded-xl bg-gradient-to-br ${c.imageColor} opacity-50 shrink-0`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-slate-400">{c.brand}</div>
                  <div className="text-[13.5px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                    {c.model}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{reason}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <SignalPill signal={c.signal} size="sm" />
                    <span className="text-[11.5px] font-bold text-[color:var(--color-brand-navy)] tabular-nums">
                      {formatKRW(c.medianContract)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => onHeart(e, c)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={isWatched ? "관심 해제" : "관심 담기"}
                  className={`h-10 w-10 rounded-full grid place-items-center shrink-0 touch-manipulation ${
                    isWatched
                      ? "text-[color:var(--color-signal-buy)] bg-[color:var(--color-signal-buy)]/10"
                      : "text-slate-400 bg-slate-50"
                  }`}
                >
                  <Heart className="h-[18px] w-[18px]" fill={isWatched ? "currentColor" : "none"} />
                </button>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
