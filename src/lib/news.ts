import { supabase } from "@/integrations/supabase/client";
import { findCar, MOCK_CARS } from "@/lib/mock-cars";

export type NewsKind = "launch" | "facelift" | "promo" | "rumor";

export type NewsItem = {
  id: string;
  kind: NewsKind;
  tag: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  carId?: string;
  image?: string;
  accent: string;
};

const ACCENT: Record<NewsKind, string> = {
  launch: "from-sky-500 to-indigo-600",
  facelift: "from-violet-500 to-purple-600",
  promo: "from-emerald-500 to-teal-600",
  rumor: "from-amber-500 to-orange-600",
};

function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function carIdFromUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  const m = url.match(/\/car\/([^/?#]+)/);
  return m?.[1];
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const { data, error } = await (supabase as any)
    .from("news_items")
    .select("id, kind, tag, title, subtitle, url, published_at")
    .order("published_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return getNewsItemsSync();

  return data.map((n: any) => {
    const kind = (n.kind as NewsKind) || "launch";
    const carId = carIdFromUrl(n.url);
    const car = carId ? findCar(carId) ?? MOCK_CARS.find((c) => c.id === carId) : undefined;
    return {
      id: n.id,
      kind,
      tag: n.tag ?? NEWS_KIND_META[kind].label,
      title: n.title,
      subtitle: n.subtitle ?? "",
      dateLabel: dateLabel(n.published_at),
      carId,
      image: car?.image,
      accent: ACCENT[kind] ?? ACCENT.launch,
    };
  });
}

/** hydrate 전 폴백 (빈 배열 우선 — DB 실패 시에만) */
export function getNewsItems(): NewsItem[] {
  return getNewsItemsSync();
}

function getNewsItemsSync(): NewsItem[] {
  // 동기 호출처 호환: 캐시된 차 이미지로만 보강, 하드코딩 피드 제거
  return [];
}

export const NEWS_KIND_META: Record<NewsKind, { label: string }> = {
  launch: { label: "신차 출시" },
  facelift: { label: "연식/부분변경" },
  promo: { label: "프로모션" },
  rumor: { label: "업계 루머" },
};
