/**
 * 공식 프로모 문구의 `만` 단위 금액 파싱.
 * `70만원` `100만` `217.9만` → 원.
 * `20/30만` `30만/50만` `50만/30만` 구간 → 최소값 (과대계상 방지).
 * 단일 문구에 여러 독립 `만`이 있으면 최대값.
 */
export function parseManAmount(text: string): number {
  const cleaned = text.replace(/,/g, "");

  // `30만/50만` `7만/14만/21만`
  const manSlash = cleaned.match(
    /(\d+(?:\.\d+)?\s*만(?:\s*\/\s*\d+(?:\.\d+)?\s*만)+)/,
  );
  if (manSlash) {
    const nums = [...manSlash[1]!.matchAll(/(\d+(?:\.\d+)?)\s*만/g)].map((m) =>
      Math.round(Number(m[1]) * 10_000),
    );
    return Math.min(...nums);
  }

  // `20/30만` `7/14/21/28만`
  const bareSlash = cleaned.match(
    /(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)+\s*만)/,
  );
  if (bareSlash) {
    const nums = bareSlash[1]!.split("/").map((p) =>
      Math.round(Number(p.replace(/[^\d.]/g, "")) * 10_000),
    );
    return Math.min(...nums.filter((n) => n > 0));
  }

  const parts = [...cleaned.matchAll(/(\d+(?:\.\d+)?)\s*만/g)].map((m) =>
    Math.round(Number(m[1]) * 10_000),
  );
  if (!parts.length) return 0;
  return Math.max(...parts);
}
