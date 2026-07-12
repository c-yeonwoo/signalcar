import { useEffect, useMemo, useState } from "react";
import { Heart, Check, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATALOG } from "@/lib/mock-cars";
import { getWatchlist, toggleWatch } from "@/lib/watchlist-store";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WatchlistAddSheet({ open, onOpenChange }: Props) {
  const brands = useMemo(() => {
    const set = new Set(CATALOG.map((c) => c.brand));
    return ["전체", ...Array.from(set)];
  }, []);
  const [brand, setBrand] = useState<string>("전체");
  const [q, setQ] = useState("");
  const [watchIds, setWatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const sync = () => setWatchIds(getWatchlist());
    sync();
    window.addEventListener("sc:watchlist-change", sync);
    return () => window.removeEventListener("sc:watchlist-change", sync);
  }, [open]);

  const filtered = useMemo(() => {
    const kw = q.trim();
    return CATALOG.filter((c) => (brand === "전체" ? true : c.brand === brand))
      .filter((c) =>
        kw === "" ? true : `${c.brand} ${c.model} ${c.bodyType}`.includes(kw),
      );
  }, [brand, q]);

  const onToggle = (id: string, priceFrom: number, model: string) => {
    const { added } = toggleWatch(id, { price: priceFrom * 10000 });
    setWatchIds(getWatchlist());
    toast.success(added ? `${model} 관심에 담았어요` : `${model} 관심에서 뺐어요`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-w-[480px] mx-auto p-0 pb-4 max-h-[85vh] flex flex-col"
      >
        <SheetHeader className="text-left px-5 pt-5 pb-3 shrink-0">
          <SheetTitle className="text-[color:var(--color-brand-navy)] text-[15px]">
            관심 차 추가
          </SheetTitle>
          <p className="text-[11.5px] text-slate-500 mt-1">
            브랜드나 이름으로 찾아서 하트를 누르면 담겨요. (최대 5대)
          </p>
        </SheetHeader>

        <div className="px-5 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="차종·브랜드 검색"
              className="w-full pl-8 pr-3 py-2 text-[12.5px] rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[color:var(--color-brand-blue)] focus:bg-white"
            />
          </div>
        </div>

        <div className="px-5 pb-2 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            {brands.map((b) => {
              const active = brand === b;
              return (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition ${
                    active
                      ? "bg-[color:var(--color-brand-navy)] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-1 pb-2">
          {filtered.length === 0 ? (
            <div className="text-center text-[12px] text-slate-400 py-10">
              검색 결과가 없어요
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const on = watchIds.includes(c.id);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] text-slate-400">{c.brand}</span>
                        <span className="text-[10.5px] text-slate-300">·</span>
                        <span className="text-[10.5px] text-slate-400">{c.bodyType}</span>
                      </div>
                      <div className="text-[13px] font-bold text-[color:var(--color-brand-navy)] mt-0.5 truncate">
                        {c.model}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                        {c.priceFrom.toLocaleString()}~{c.priceTo.toLocaleString()}만원
                      </div>
                    </div>
                    <button
                      onClick={() => onToggle(c.id, c.priceFrom, c.model)}
                      aria-label={on ? "관심에서 빼기" : "관심에 담기"}
                      className={`h-10 w-10 grid place-items-center rounded-full transition ${
                        on
                          ? "bg-[color:var(--color-brand-blue)] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {on ? <Check className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
