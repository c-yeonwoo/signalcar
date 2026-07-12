import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, ChevronRight } from "lucide-react";
import { getNewsItems, type NewsItem } from "@/lib/news";

/**
 * 홈 상단 신차 소식 히어로 배너.
 * - 최신 소식 1건을 큰 카드로, 나머지는 아래 도트 인디케이터로 자동 순환.
 */
export function NewsHero() {
  const items = getNewsItems();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[idx];

  return (
    <section className="px-5 mt-3">
      <NewsCard item={item} />
      {items.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {items.map((n, i) => (
            <button
              key={n.id}
              onClick={() => setIdx(i)}
              aria-label={`소식 ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-slate-700" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const inner = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}
    >
      {/* 이미지 워터마크 */}
      {item.image && (
        <img
          src={item.image}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-4 h-32 w-auto opacity-25 object-contain"
        />
      )}
      <div className="relative p-4">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2 py-0.5 text-[10.5px] font-bold tracking-wide">
            <Megaphone className="h-3 w-3" />
            신차 소식
          </span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold">
            {item.tag}
          </span>
          <span className="ml-auto text-[10.5px] text-white/80">{item.dateLabel}</span>
        </div>
        <h3 className="mt-2.5 text-[15.5px] font-extrabold leading-snug pr-16">{item.title}</h3>
        <p className="mt-1 text-[12px] text-white/85 leading-snug pr-16">{item.subtitle}</p>
        {item.carId && (
          <div className="mt-2.5 inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-white/95">
            자세히 보기
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );

  if (item.carId) {
    return (
      <Link to="/car/$vehicleId" params={{ vehicleId: item.carId }} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}