import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatKRW, type MockCar } from "@/lib/mock-cars";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";
import { discoverCandidates } from "@/lib/recommend";

export function DiscoveryCarousel() {
  const [watchIds, setWatchIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setWatchIds(getWatchlist());
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    window.addEventListener("sc:prefs-change", sync);
    return () => {
      window.removeEventListener("sc:watchlist-change", sync);
      window.removeEventListener("sc:prefs-change", sync);
    };
  }, []);

  const items = discoverCandidates(watchIds, 6);
  if (items.length === 0) return null;

  const handleWatch = (car: MockCar, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(car.id);
    toast.success(added ? `${car.model} 관심에 담았어요` : "관심에서 뺐어요");
  };

  const headline = watchIds.length > 0 ? "이 차는 어때요?" : "이런 차부터 둘러볼까요?";

  return (
    <section className="mt-6">
      <div className="px-5 flex items-baseline justify-between">
        <div className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-blue)]" />
          <span className="text-[13px] font-bold text-[color:var(--color-brand-navy)]">{headline}</span>
        </div>
        <span className="text-[11px] text-slate-400">가로 스크롤</span>
      </div>
      <div className="mt-3 pl-5 flex gap-3 overflow-x-auto pb-2 no-scrollbar" style={{ scrollSnapType: "x mandatory" }}>
        {items.map(({ car, reason }) => {
          const watched = watchIds.includes(car.id);
          return (
            <Link
              key={car.id}
              to="/car/$vehicleId"
              params={{ vehicleId: car.id }}
              className="shrink-0 w-[168px] rounded-2xl bg-white border border-slate-100 shadow-sm p-3 active:scale-[0.99] transition"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="relative aspect-[4/3] rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                <img src={car.image} alt={car.model} className="w-full h-full object-contain" />
                <button
                  onClick={(e) => handleWatch(car, e)}
                  aria-label={watched ? "관심 해제" : "관심 담기"}
                  className={`absolute top-1.5 right-1.5 h-7 w-7 rounded-full grid place-items-center backdrop-blur bg-white/80 shadow-sm ${
                    watched ? "text-[color:var(--color-signal-buy)]" : "text-slate-400"
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 ${watched ? "fill-current" : ""}`} />
                </button>
              </div>
              <div className="mt-2">
                <div className="text-[11px] text-slate-500">{car.brand}</div>
                <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] truncate">
                  {car.model}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                  {formatKRW(car.medianContract)}
                </div>
                <div className="mt-1.5 text-[10.5px] text-[color:var(--color-brand-blue)] font-semibold truncate">
                  {reason}
                </div>
              </div>
            </Link>
          );
        })}
        <div className="shrink-0 w-2" />
      </div>
    </section>
  );
}