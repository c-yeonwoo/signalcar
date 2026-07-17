/**
 * OEM 가격표 PDF 텍스트 → 트림·선택옵션.
 * 브랜드별 표 포맷이 달라 휴리스틱을 분리한다.
 */

export type ParsedTrim = {
  name: string;
  nameEn?: string;
  basePrice: number; // 원
};

export type ParsedOption = {
  name: string;
  price: number; // 원
};

export type ParsedPriceTable = {
  brand: string;
  modelHint: string;
  vehicleSlug: string;
  fuelHint?: string | null;
  trims: ParsedTrim[];
  options: ParsedOption[];
  parser: "hyundai-v1" | "kia-v1" | "generic-v1";
};

const MIN_TRIM_WON = 12_000_000;
const MAX_TRIM_WON = 250_000_000;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s가-힣\-]+/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseWon(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function dedupeTrims(trims: ParsedTrim[]): ParsedTrim[] {
  const seen = new Set<string>();
  const out: ParsedTrim[] = [];
  for (const t of trims) {
    if (t.basePrice < MIN_TRIM_WON || t.basePrice > MAX_TRIM_WON) continue;
    const key = `${t.name}|${t.basePrice}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.sort((a, b) => a.basePrice - b.basePrice);
}

function dedupeOptions(opts: ParsedOption[]): ParsedOption[] {
  const seen = new Set<string>();
  const out: ParsedOption[] = [];
  for (const o of opts) {
    if (o.price < 50_000 || o.price > 20_000_000) continue;
    if (o.name.length > 40 || o.name.includes("•") || o.name.includes("기본 품목")) continue;
    const key = `${o.name}|${o.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/** 현대: `Exclusive (익스클루시브) 36,570,000 33,245,455(3,324,545)` */
export function parseHyundaiPriceText(
  text: string,
  meta: { carName: string; carEngName?: string; brand?: string },
): ParsedPriceTable {
  const re =
    /([A-Za-z][A-Za-z0-9 +\-\/]{0,40}?)\s*(?:\(([^)]{1,40})\))?\s+([\d,]{8,})\s+[\d,]+\([\d,]+\)/g;
  const trims: ParsedTrim[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const en = m[1]!.trim();
    const ko = (m[2] ?? "").trim();
    // 잡음: "Black Exterior" 등은 트림, 과도한 설명 스킵
    if (en.length > 32) continue;
    if (/^(LED|USB|ISG|Full|The)\b/i.test(en)) continue;
    trims.push({
      name: ko || en,
      nameEn: en,
      basePrice: parseWon(m[3]!),
    });
  }

  const optRe = /▶\s*([^▶\[\n]{2,40}?)\s*\[([\d,]+)\]/g;
  const options: ParsedOption[] = [];
  while ((m = optRe.exec(text))) {
    options.push({ name: m[1]!.trim(), price: parseWon(m[2]!) });
  }

  const eng = meta.carEngName?.trim() || slugify(meta.carName);
  const fuelHint = /hybrid|hev|전기|electric|ev/i.test(`${meta.carName} ${eng}`)
    ? /electric|전기|ev/i.test(`${meta.carName} ${eng}`)
      ? "ev"
      : "hybrid"
    : null;

  return {
    brand: meta.brand ?? "현대",
    modelHint: meta.carName,
    vehicleSlug: slugify(eng.replace(/^the-/, "").replace(/^the-all-new-/, "all-new-")),
    fuelHint,
    trims: dedupeTrims(trims),
    options: dedupeOptions(options),
    parser: "hyundai-v1",
  };
}

const KIA_TRIM_NAMES =
  "프레스티지|노블레스|시그니처|트렌디|그래비티|스탠다드|에어|라이트|플러스|어스|윈드|GT-Line|GT Line|센슈어스|업|다운";

/** 기아: `노블레스 3,946만` (선택품목 소액은 하한으로 제외) */
export function parseKiaPriceText(
  text: string,
  meta: { slug: string; brand?: string },
): ParsedPriceTable {
  const re = new RegExp(`(${KIA_TRIM_NAMES})\\s*([\\d,]+)\\s*만`, "g");
  const trims: ParsedTrim[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const man = parseWon(m[2]!);
    trims.push({ name: m[1]!.replace(/\s+/g, " ").trim(), basePrice: man * 10_000 });
  }

  const optRe = /▶\s*([^▶\[\n]{2,40}?)\s*(?:\[([\d,]+)\]|([\d,]+)\s*만)/g;
  const options: ParsedOption[] = [];
  while ((m = optRe.exec(text))) {
    const won = m[2] ? parseWon(m[2]) : parseWon(m[3]!) * 10_000;
    options.push({ name: m[1]!.trim(), price: won });
  }

  const slug = slugify(meta.slug);
  const fuelHint = /hybrid|hev|ev|electric/i.test(slug)
    ? /ev|electric/i.test(slug)
      ? "ev"
      : "hybrid"
    : null;

  return {
    brand: meta.brand ?? "기아",
    modelHint: meta.slug,
    vehicleSlug: slug.replace(/-hybrid$|-hev$|-ev$|-electric$/, "") || slug,
    fuelHint,
    trims: dedupeTrims(trims),
    options: dedupeOptions(options),
    parser: "kia-v1",
  };
}

/** 제네시스 등: 원 단위 또는 만 단위 혼재 시 최소 휴리스틱 */
export function parseGenericPriceText(
  text: string,
  meta: { modelHint: string; vehicleSlug: string; brand: string },
): ParsedPriceTable {
  const hyundaiLike = parseHyundaiPriceText(text, {
    carName: meta.modelHint,
    carEngName: meta.vehicleSlug,
    brand: meta.brand,
  });
  if (hyundaiLike.trims.length >= 2) {
    return { ...hyundaiLike, brand: meta.brand, vehicleSlug: meta.vehicleSlug, parser: "generic-v1" };
  }
  const kiaLike = parseKiaPriceText(text, { slug: meta.vehicleSlug, brand: meta.brand });
  return {
    ...kiaLike,
    brand: meta.brand,
    modelHint: meta.modelHint,
    vehicleSlug: meta.vehicleSlug,
    parser: "generic-v1",
  };
}
