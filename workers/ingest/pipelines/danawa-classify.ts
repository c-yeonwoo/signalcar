/**
 * 다나와 deep(+enrich) 스냅샷 → 쇼핑 에이전트용 분류.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DanawaDeepCatalog } from "./danawa-private";
import type { SpecEnrichment } from "./danawa-enrich";

export type PriceBand =
  | "under_20m"
  | "20_30m"
  | "30_40m"
  | "40_60m"
  | "60_80m"
  | "80_120m"
  | "over_120m"
  | "unknown";

export type PowertrainHint =
  | "ev"
  | "hev"
  | "phev"
  | "fcev"
  | "ice"
  | "unknown";

export type BuyerFitTag =
  | "first_car"
  | "family"
  | "commute"
  | "performance"
  | "prestige"
  | "commercial"
  | "adventure";

export type ClassifiedModel = {
  modelId: string;
  brandId: string;
  brandName: string;
  brandGroup: string;
  name: string;
  segment?: string;
  segmentNorm: "passenger" | "rv" | "commercial" | "unknown";
  powertrain: PowertrainHint;
  fuels: string[];
  displacementsCc: number[];
  priceMinWon?: number;
  priceMaxWon?: number;
  priceBand: PriceBand;
  trimCount: number;
  buyerTags: BuyerFitTag[];
  href: string;
};

function priceBand(min?: number): PriceBand {
  if (min == null) return "unknown";
  const m = min / 10_000;
  if (m < 2000) return "under_20m";
  if (m < 3000) return "20_30m";
  if (m < 4000) return "30_40m";
  if (m < 6000) return "40_60m";
  if (m < 8000) return "60_80m";
  if (m < 12000) return "80_120m";
  return "over_120m";
}

function segmentFromMeta(seg: string | undefined, name: string): ClassifiedModel["segmentNorm"] {
  if (seg) {
    if (/상용|트럭|버스/.test(seg)) return "commercial";
    if (/RV|SUV|MPV|승합/i.test(seg)) return "rv";
    if (/승용|세단|쿠페/.test(seg)) return "passenger";
  }
  const s = name;
  if (/포터|마이티|파비스|카운티|쏠라티|봉고|트럭|버스|ST1|탑차|윙바디|파워게이트/i.test(s))
    return "commercial";
  if (
    /투싼|싼타페|팰리세이드|코나|베뉴|스포티지|쏘렌토|셀토스|니로|카니발|스타리아|GV[0-9]|EV[569]|아이오닉\s*[359]|넥쏘|렉스턴|토레스|티볼리|코란도|QM6|XM3|오스트랄|에스파스|이쿼녹스|타호|아우디 Q|X[1-7]\b|GLE|GLC|GLB|GLA|CLA|Range Rover|카이엔|마칸|XC|RAV4|CR-V|CX-|아웃백|포레스터|픽업|Tasman|Ranger|아이오닉 3/i.test(
      s,
    )
  )
    return "rv";
  if (
    /아반떼|쏘나타|그랜저|K[3589]|모닝|레이|G[789]0|i[3457]|3시리즈|5시리즈|7시리즈|E클래스|C클래스|A[4-8]|Model [3S]|캠리|아코드|IS\b|ES\b|라팔|메간|세단|CLA-Class|C-Class/i.test(
      s,
    )
  )
    return "passenger";
  if (/콘셉트|Concept|X 콘셉트/i.test(s)) return "unknown";
  return "unknown";
}

function powertrainFromName(name: string, title?: string): PowertrainHint {
  const s = `${name} ${title ?? ""}`;
  if (/넥쏘|수소|FCEV/i.test(s)) return "fcev";
  if (/PHEV|플러그.?인/i.test(s)) return "phev";
  if (/Hybrid|하이브리드|HEV|Electrified(?!\s*G)/i.test(s)) return "hev";
  if (
    /일렉트릭|Electric|\bEV\b|아이오닉|EV[0-9]|IONIQ|Model [3YSX]|GV60(?!\s*MAGMA)|Electrified G/i.test(
      s,
    )
  )
    return "ev";
  return "unknown";
}

function buyerTags(m: ClassifiedModel): BuyerFitTag[] {
  const tags = new Set<BuyerFitTag>();
  if (m.segmentNorm === "commercial") tags.add("commercial");
  if (m.segmentNorm === "rv") tags.add("family");
  if (m.priceBand === "under_20m" || m.priceBand === "20_30m") tags.add("first_car");
  if (m.priceBand === "30_40m" || m.priceBand === "40_60m") {
    tags.add("commute");
    if (m.segmentNorm === "rv") tags.add("family");
  }
  if (/N\b|GT|AMG|\bM\b|RS|S[0-9]|Sport|Track|MAGMA|퍼포먼스/i.test(m.name))
    tags.add("performance");
  if (
    m.priceBand === "80_120m" ||
    m.priceBand === "over_120m" ||
    /벤츠|BMW|포르쉐|제네시스|렉서스|아우디|볼보|벤틀리|롤스|페라리|람보|마세라티/.test(
      m.brandName,
    )
  ) {
    if (m.priceBand !== "under_20m" && m.priceBand !== "20_30m") tags.add("prestige");
  }
  if (/픽업|Ranger|Tasman|렉스턴 스포츠|무쏘|R1T|사이버/i.test(m.name)) tags.add("adventure");
  if (tags.size === 0) tags.add("commute");
  return [...tags];
}

export function classifyDeepCatalog(
  deep: DanawaDeepCatalog,
  enrichments?: SpecEnrichment[],
): {
  classified: ClassifiedModel[];
  stats: Record<string, unknown>;
} {
  const brandMap = new Map(deep.catalog.brands.map((b) => [b.brandId, b]));
  const detailMap = new Map(deep.details.map((d) => [d.modelId, d]));
  const enrichMap = new Map((enrichments ?? []).map((e) => [e.modelId, e]));

  const classified: ClassifiedModel[] = [];
  for (const ref of deep.catalog.models) {
    const brand = brandMap.get(ref.brandId);
    const detail = detailMap.get(ref.modelId);
    const enrich = enrichMap.get(ref.modelId);
    const priceMin = detail?.pricesWon[0];
    const priceMax = detail?.pricesWon.length
      ? detail.pricesWon[detail.pricesWon.length - 1]
      : undefined;

    const fromSpec = enrich?.powertrain;
    const fromName = powertrainFromName(ref.name, detail?.title);
    const powertrain: PowertrainHint =
      fromSpec && fromSpec !== "unknown"
        ? fromSpec
        : fromName !== "unknown"
          ? fromName
          : "ice";

    const row: ClassifiedModel = {
      modelId: ref.modelId,
      brandId: ref.brandId,
      brandName: brand?.name ?? ref.brandId,
      brandGroup: brand?.group ?? "기타",
      name: ref.name,
      segment: ref.segment,
      segmentNorm: segmentFromMeta(ref.segment, ref.name),
      powertrain,
      fuels: enrich?.fuelLabels ?? [],
      displacementsCc: enrich?.displacementsCc ?? [],
      priceMinWon: priceMin,
      priceMaxWon: priceMax,
      priceBand: priceBand(priceMin),
      trimCount: detail?.trimRefs.length ?? 0,
      buyerTags: [],
      href: ref.href,
    };
    row.buyerTags = buyerTags(row);
    classified.push(row);
  }

  const countBy = (key: (c: ClassifiedModel) => string) => {
    const o: Record<string, number> = {};
    for (const c of classified) {
      const k = key(c);
      o[k] = (o[k] ?? 0) + 1;
    }
    return o;
  };

  return {
    classified,
    stats: {
      total: classified.length,
      byGroup: countBy((c) => c.brandGroup),
      bySegment: countBy((c) => c.segmentNorm),
      byPowertrain: countBy((c) => c.powertrain),
      byPriceBand: countBy((c) => c.priceBand),
      byBuyerTag: classified.reduce(
        (acc, c) => {
          for (const t of c.buyerTags) acc[t] = (acc[t] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      firstCarCandidates: classified.filter((c) => c.buyerTags.includes("first_car")).length,
      withFuelData: classified.filter((c) => c.fuels.length > 0).length,
      withDisplacement: classified.filter((c) => c.displacementsCc.length > 0).length,
    },
  };
}

export function loadLatestEnrichments(outDir: string): SpecEnrichment[] | undefined {
  const files = readdirSync(outDir)
    .filter((f) => f.startsWith("danawa-private-catalog-enrich-") && f.endsWith(".json"))
    .sort();
  if (!files.length) return undefined;
  const data = JSON.parse(readFileSync(join(outDir, files.at(-1)!), "utf8")) as {
    enrichments?: SpecEnrichment[];
  };
  return data.enrichments;
}

export function loadLatestDeepCatalog(outDir: string): {
  path: string;
  data: DanawaDeepCatalog;
} {
  const files = readdirSync(outDir)
    .filter(
      (f) =>
        f.startsWith("danawa-private-catalog-deep-") &&
        f.endsWith(".json") &&
        !f.includes("checkpoint") &&
        !f.includes("enrich"),
    )
    .sort();
  if (!files.length) throw new Error(`No deep catalog in ${outDir}`);
  const path = join(outDir, files.at(-1)!);
  return { path, data: JSON.parse(readFileSync(path, "utf8")) as DanawaDeepCatalog };
}

export function runClassifyToFile(cwd = process.cwd()) {
  const outDir = join(cwd, "workers/ingest/out");
  const { path: src, data } = loadLatestDeepCatalog(outDir);
  const enrichments = loadLatestEnrichments(outDir);
  const result = classifyDeepCatalog(data, enrichments);
  const out = join(outDir, `danawa-private-classified-${Date.now()}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        source: "danawa-private-classified",
        from: src,
        enrichmentsUsed: Boolean(enrichments?.length),
        enrichmentsCount: enrichments?.length ?? 0,
        fetchedAt: new Date().toISOString(),
        stats: result.stats,
        models: result.classified,
      },
      null,
      2,
    ),
  );
  return { out, stats: result.stats, count: result.classified.length };
}
