import { computeNewVsUsed, VERDICT_LABEL, VERDICT_TONE } from "@/lib/new-vs-used";

// 신차 vs 1년 중고 결정 한 줄 뱃지.
// priceFrom(만원 단위)만 있는 카탈로그 카드에서도 쓸 수 있게 newPrice(원) + bodyType만 받음.
export function NewVsUsedBadge({
  newPrice,
  bodyType,
  variant = "chip",
}: {
  newPrice: number;
  bodyType: string;
  variant?: "chip" | "inline";
}) {
  if (!newPrice || !bodyType) return null;
  const r = computeNewVsUsed({ newPrice, bodyType });
  const tone = VERDICT_TONE[r.verdict];
  const toneVar =
    tone === "buy"
      ? "var(--color-signal-buy)"
      : tone === "wait"
        ? "var(--color-signal-wait)"
        : "var(--color-brand-blue)";

  const label = `중고차 대비 · ${VERDICT_LABEL[r.verdict]} (신차 −${r.gap1yPct}% 프리미엄)`;

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums" style={{ color: toneVar }}>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: toneVar }}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wider"
      style={{
        backgroundColor: `color-mix(in oklab, ${toneVar} 14%, white)`,
        color: toneVar,
        border: `1px solid color-mix(in oklab, ${toneVar} 28%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
