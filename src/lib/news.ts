import { MOCK_CARS } from "./mock-cars";

export type NewsKind = "launch" | "facelift" | "promo" | "rumor";

export type NewsItem = {
  id: string;
  kind: NewsKind;
  tag: string; // 짧은 배지
  title: string; // 한 줄 헤드라인
  subtitle: string; // 보조 설명
  dateLabel: string; // 예: "오늘", "7월 10일"
  carId?: string; // 상세로 연결 가능한 경우
  image?: string;
  accent: string; // gradient (tailwind classes)
};

// 큐레이션된 신차 소식 (mock). 최신순.
const RAW: NewsItem[] = [
  {
    id: "n-grand-koleos-promo",
    kind: "promo",
    tag: "NEW 프로모션",
    title: "그랑콜레오스, 이번 달 220만원 현금할인",
    subtitle: "밀어내기 시즌 · 최근 6개월 중 2번째로 좋은 조건",
    dateLabel: "오늘",
    carId: "grand-koleos-inspire",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    id: "n-santafe-facelift",
    kind: "rumor",
    tag: "부분변경 루머",
    title: "싼타페 F/L, 2026년 1월 공개 유력",
    subtitle: "재고 할인 확대 가능성 · 지금 계약은 신중히",
    dateLabel: "3일 전",
    carId: "santafe-calligraphy",
    accent: "from-amber-500 to-orange-600",
  },
  {
    id: "n-grand-koleos-yc",
    kind: "facelift",
    tag: "연식변경 예정",
    title: "그랑콜레오스 26년형, 2월 출시 예정",
    subtitle: "현재 재고 소진 프로모션 진행 중",
    dateLabel: "5일 전",
    carId: "grand-koleos-inspire",
    accent: "from-sky-500 to-indigo-600",
  },
];

export function getNewsItems(): NewsItem[] {
  // carId가 있으면 실제 차량 이미지를 붙여준다
  return RAW.map((n) => {
    const car = n.carId ? MOCK_CARS.find((c) => c.id === n.carId) : undefined;
    return { ...n, image: car?.image };
  });
}

export const NEWS_KIND_META: Record<NewsKind, { label: string }> = {
  launch: { label: "신차 출시" },
  facelift: { label: "연식/부분변경" },
  promo: { label: "프로모션" },
  rumor: { label: "업계 루머" },
};