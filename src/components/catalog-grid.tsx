import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Search, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  CATALOG,
  BODY_GROUPS,
  FUEL_LABEL,
  catalogHasDetail,
  type CatalogEntry,
  type Fuel,
} from "@/lib/mock-cars";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";

/**
 * 전체 차량 전체 차량 그리드.
 * - 검색 · 바디타입 · 가격 · 연료 필터
 * - 각 카드 하트 = 관심 담기 (상세 유무와 무관하게 저장 가능)
 * - 상세가 있는 차만 카드 전체가 링크. 없으면 "곧 오픈" 표시.
 */

const PRICE_BANDS: { id: string; label: string; min: number; max: number }[] = [
  { id: "all", label: "전체", min: 0, max: 999999 },
  { id: "u3",  label: "~3천만", min: 0, max: 3000 },
  { id: "3-5", label: "3~5천만", min: 3000, max: 5000 },
  { id: "5-8", label: "5~8천만", min: 5000, max: 8000 },
  { id: "8+",  label: "8천만~",  min: 8000, max: 999999 },
];

const TAG_STYLE: Record<string, string> = {
  hot:      "bg-[color:var(--color-signal-buy)]/10 text-[color:var(--color-signal-buy)]",
  discount: "bg-[color:var(--color-signal-buy)]/10 text-[color:var(--color-signal-buy)]",
  new:      "bg-[color:var(--color-brand-blue)]/10 text-[color:var(--color-brand-blue)]",
  facelift: "bg-[color:var(--color-signal-wait)]/10 text-[color:var(--color-signal-wait)]",
};
const TAG_LABEL: Record<string, string> = {
  hot: "인기", discount: "할인중", new: "신차", facelift: "부분변경",
};

export function CatalogGrid() {
  const [q, setQ] = useState("");
  const [body, setBody] = useState<string>("all");
  const [band, setBand] = useState<string>("all");
  const [fuel, setFuel] = useState<Fuel | "all">("all");
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setWatched(getWatchlist());
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    return () => window.removeEventListener("sc:watchlist-change", sync);
  }, []);

  const bodyGroup = BODY_GROUPS.find((g) => g.id === body) ?? BODY_GROUPS[0];
  const bandRange = PRICE_BANDS.find((b) => b.id === band) ?? PRICE_BANDS[0];

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return CATALOG.filter((c) => {
      if (!bodyGroup.match(c.bodyType)) return false;
      if (c.priceFrom > bandRange.max || c.priceTo < bandRange.min) return false;
      if (fuel !== "all" && !c.fuels.includes(fuel)) return false;
      if (qq && !(`${c.brand} ${c.model}`.toLowerCase().includes(qq))) return false;
      return true;
    });
  }, [q, bodyGroup, bandRange, fuel]);

  const onHeart = (e: React.MouseEvent, c: CatalogEntry) => {
    e.preventDefault();
    e.stopPropagation();
    const { added } = toggleWatch(c.id, { price: c.priceFrom });
    setWatched(getWatchlist());
    toast.success(added ? `${c.model} 관심 담음` : `${c.model} 관심 해제`);
  };

  return (
    <div className="px-5 mt-4">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="브랜드 · 모델명 검색"
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-white border border-slate-200 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[color:var(--color-brand-blue)]"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center"
            aria-label="검색어 지우기"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Filters */}
      <FilterRow value={body} onChange={setBody} items={BODY_GROUPS.map((g) => ({ id: g.id, label: g.label }))} />
      <FilterRow value={band} onChange={setBand} items={PRICE_BANDS.map((b) => ({ id: b.id, label: b.label }))} className="mt-2" />
      <FilterRow
        value={fuel}
        onChange={(v) => setFuel(v as Fuel | "all")}
        items={[
          { id: "all", label: "전 연료" },
          { id: "gasoline", label: "가솔린" },
          { id: "hybrid", label: "하이브리드" },
          { id: "diesel", label: "디젤" },
          { id: "ev", label: "전기" },
        ]}
        className="mt-2"
      />

      <div className="mt-3 text-[11px] text-slate-500">{filtered.length}개 차종</div>

      {filtered.length === 0 ? (
        <div className="mt-6 sc-card p-6 text-center text-[12.5px] text-slate-500">
          조건에 맞는 차가 없어요. 필터를 완화해 보세요.
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {filtered.map((c) => {
            const hasDetail = catalogHasDetail(c.id);
            const isWatched = watched.includes(c.id);
            const card = (
              <div className="sc-card p-3 h-full flex flex-col active:scale-[0.99] transition">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-[10.5px] text-slate-400">{c.brand}</div>
                    <div className="text-[13.5px] font-semibold text-[color:var(--color-brand-navy)] truncate">
                      {c.model}
                    </div>
                  </div>
                  <button
                    onClick={(e) => onHeart(e, c)}
                    aria-pressed={isWatched}
                    aria-label={isWatched ? "관심 해제" : "관심 담기"}
                    className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition ${
                      isWatched
                        ? "bg-[color:var(--color-signal-buy)]/10 text-[color:var(--color-signal-buy)]"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <Heart className="h-4 w-4" fill={isWatched ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="mt-1 text-[10.5px] text-slate-500">{c.bodyType}</div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {c.fuels.map((f) => (
                    <span key={f} className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {FUEL_LABEL[f]}
                    </span>
                  ))}
                  {c.tag && (
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-semibold ${TAG_STYLE[c.tag]}`}>
                      {TAG_LABEL[c.tag]}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[9.5px] text-slate-400">시작가</div>
                    <div className="text-[13px] font-extrabold text-[color:var(--color-brand-navy)] leading-tight">
                      {c.priceFrom.toLocaleString()}
                      <span className="text-[10px] font-medium text-slate-400">만~</span>
                    </div>
                  </div>
                  {hasDetail ? (
                    <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[color:var(--color-brand-blue)]">
                      상세<ChevronRight className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-slate-400">시그널 준비중</span>
                  )}
                </div>
              </div>
            );
            return (
              <li key={c.id}>
                {hasDetail ? (
                  <Link
                    to="/car/$vehicleId"
                    params={{ vehicleId: c.id }}
                    className="block h-full"
                  >
                    {card}
                  </Link>
                ) : (
                  <div className="h-full">{card}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterRow({
  value,
  onChange,
  items,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${className ?? ""}`}>
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`shrink-0 h-8 px-3 rounded-full text-[11.5px] font-semibold transition ${
              active
                ? "bg-[color:var(--color-brand-navy)] text-white"
                : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}