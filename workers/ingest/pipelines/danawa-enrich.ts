/**
 * 다나와 스펙 AJAX → 연료/배기량 보강.
 * Type=spec + Type=item HTML 키워드 집계 (압축 payload는 커스텀 인코딩이라 HTML 파싱 우선).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DanawaDeepCatalog, DanawaModelSnapshot } from "./danawa-private";

const BASE = "https://mauto.danawa.com";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) App/iPhone/3.0.69 (Auto, 2)";

export type FuelKind = "gasoline" | "diesel" | "lpg" | "electric" | "hydrogen" | "cng";

export type SpecEnrichment = {
  modelId: string;
  fuels: Partial<Record<FuelKind, number>>;
  fuelLabels: string[];
  displacementsCc: number[];
  hasPluginHybridWord: boolean;
  hasHybridWord: boolean;
  powertrain: "ev" | "hev" | "phev" | "fcev" | "ice" | "unknown";
  iceFuels: FuelKind[];
  fetchedAt: string;
};

async function getHtml(url: string, referer: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,*/*",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.text();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const FUEL_CELL_RE =
  />(가솔린|디젤|경유|LPG|전기(?:\s*\(\s*수소연료전지\s*\))?|수소전기|하이브리드|수소|CNG|플러그인\s*하이브리드|가솔린\s*\+\s*전기)\s*</g;

function mapFuel(label: string): FuelKind | "hybrid" | "phev" | null {
  const s = label.replace(/\s+/g, "");
  if (s.includes("플러그인")) return "phev";
  if (s.includes("수소")) return "hydrogen"; // 수소전기, 전기(수소연료전지), 수소
  if (s === "가솔린+전기" || s === "하이브리드") return "hybrid";
  if (s === "전기") return "electric";
  if (s === "LPG") return "lpg";
  if (s === "CNG") return "cng";
  if (s === "디젤" || s === "경유") return "diesel";
  if (s === "가솔린") return "gasoline";
  return null;
}

export function parseSpecHtml(modelId: string, specHtml: string, itemHtml: string): SpecEnrichment {
  // item 페이지는 옵션명 노이즈가 커서 spec 우선, item은 배기량 보조용
  const fuelBlob = specHtml;
  const dispBlob = `${specHtml}\n${itemHtml}`;
  const fuels: Partial<Record<FuelKind, number>> = {};
  let hybridHits = 0;
  let phevHits = 0;

  for (const m of fuelBlob.matchAll(FUEL_CELL_RE)) {
    const kind = mapFuel(m[1]!);
    if (!kind) continue;
    if (kind === "hybrid") {
      hybridHits++;
      if (m[1]!.replace(/\s+/g, "").includes("가솔린+전기")) {
        fuels.gasoline = (fuels.gasoline ?? 0) + 1;
        fuels.electric = (fuels.electric ?? 0) + 1;
      }
      continue;
    }
    if (kind === "phev") {
      phevHits++;
      continue;
    }
    fuels[kind] = (fuels[kind] ?? 0) + 1;
  }

  const hasHybridWord = hybridHits > 0;
  const hasPluginHybridWord = phevHits > 0;

  const displacementsCc = [
    ...new Set(
      [
        ...[...dispBlob.matchAll(/>([0-9],[0-9]{3})\s*cc</g)].map((x) =>
          Number(x[1]!.replace(/,/g, "")),
        ),
        ...[...dispBlob.matchAll(/>([1-9][0-9]{2,3})\s*cc</g)].map((x) => Number(x[1]!)),
      ].filter((n) => n >= 600 && n <= 8000),
    ),
  ].sort((a, b) => a - b);

  const electric = fuels.electric ?? 0;
  const gasoline = fuels.gasoline ?? 0;
  const diesel = fuels.diesel ?? 0;
  const lpg = fuels.lpg ?? 0;
  const hydrogen = fuels.hydrogen ?? 0;
  const iceTotal = gasoline + diesel + lpg + (fuels.cng ?? 0);

  let powertrain: SpecEnrichment["powertrain"] = "unknown";
  if (hydrogen > 0) powertrain = "fcev";
  else if (electric > 0 && iceTotal === 0 && hybridHits === 0) powertrain = "ev";
  else if (phevHits > 0) powertrain = "phev";
  else if (hybridHits > 0) powertrain = "hev";
  else if (iceTotal > 0) powertrain = "ice";
  else if (electric > 0) powertrain = "ev";

  // 전기 셀이 ICE와 같이 있어도 하이브리드 셀이 없으면 ICE로 고정
  if (powertrain !== "fcev" && powertrain !== "hev" && powertrain !== "phev" && powertrain !== "ev") {
    if (iceTotal > 0) powertrain = "ice";
  }
  if (powertrain === "unknown" && iceTotal > 0) powertrain = "ice";

  const iceFuels = (["gasoline", "diesel", "lpg", "cng"] as FuelKind[]).filter(
    (k) => (fuels[k] ?? 0) > 0,
  );
  // EV가 아니면 electric 노이즈는 라벨에서 제외할 수 있게 정리
  const labelFuels = { ...fuels };
  if (powertrain === "ice" && hybridHits === 0 && phevHits === 0) {
    delete labelFuels.electric;
  }
  const fuelLabels = Object.entries(labelFuels)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k]) => k);

  return {
    modelId,
    fuels: labelFuels,
    fuelLabels,
    displacementsCc,
    hasPluginHybridWord,
    hasHybridWord,
    powertrain,
    iceFuels,
    fetchedAt: new Date().toISOString(),
  };
}

export async function enrichModelSpecs(modelId: string): Promise<SpecEnrichment> {
  const referer = `${BASE}/auto/?Work=model&Model=${modelId}`;
  const [specHtml, itemHtml] = await Promise.all([
    getHtml(`${BASE}/service/ajax_spec_mobile.php?Type=spec&Model=${modelId}`, referer),
    getHtml(`${BASE}/service/ajax_spec_mobile.php?Type=item&Model=${modelId}`, referer),
  ]);
  return parseSpecHtml(modelId, specHtml, itemHtml);
}

export type EnrichedDeepCatalog = DanawaDeepCatalog & {
  enrichments: SpecEnrichment[];
  enrichStats: {
    requested: number;
    ok: number;
    failed: number;
    byPowertrain: Record<string, number>;
  };
};

export async function enrichDeepCatalog(opts?: {
  deep?: DanawaDeepCatalog;
  delayMs?: number;
  onProgress?: (msg: string) => void;
  existing?: SpecEnrichment[];
  checkpointEvery?: number;
  onCheckpoint?: (enrichments: SpecEnrichment[]) => void;
}): Promise<EnrichedDeepCatalog> {
  const delayMs = opts?.delayMs ?? 250;
  const checkpointEvery = opts?.checkpointEvery ?? 25;
  let deep = opts?.deep;
  if (!deep) throw new Error("deep catalog required");

  const done = new Map((opts?.existing ?? []).map((e) => [e.modelId, e]));
  const enrichments: SpecEnrichment[] = [...done.values()];
  const errors: Array<{ modelId: string; error: string }> = [];
  const pending = deep.details
    .map((d) => d.modelId)
    .filter((id) => !done.has(id));

  opts?.onProgress?.(
    `enrich: total=${deep.details.length} done=${done.size} pending=${pending.length}`,
  );

  let i = 0;
  for (const modelId of pending) {
    i++;
    try {
      const e = await enrichModelSpecs(modelId);
      enrichments.push(e);
      done.set(modelId, e);
      if (i % 10 === 0 || i === pending.length) {
        opts?.onProgress?.(
          `enrich ${i}/${pending.length} last=${modelId} pt=${e.powertrain} fuels=${e.fuelLabels.join(",")}`,
        );
      }
    } catch (err) {
      errors.push({ modelId, error: String(err) });
      opts?.onProgress?.(`FAIL ${modelId}: ${err}`);
    }
    if (checkpointEvery > 0 && i % checkpointEvery === 0) {
      opts?.onCheckpoint?.([...enrichments]);
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  // merge into details for convenience
  const enMap = new Map(enrichments.map((e) => [e.modelId, e]));
  const details: DanawaModelSnapshot[] = deep.details.map((d) => {
    const e = enMap.get(d.modelId);
    if (!e) return d;
    return {
      ...d,
      // stash under raw-ish fields via cast extension — classifier reads enrichments array
    };
  });

  const byPowertrain: Record<string, number> = {};
  for (const e of enrichments) {
    byPowertrain[e.powertrain] = (byPowertrain[e.powertrain] ?? 0) + 1;
  }

  void details;
  void errors;

  return {
    ...deep,
    details: deep.details,
    enrichments,
    enrichStats: {
      requested: deep.details.length,
      ok: enrichments.length,
      failed: errors.length,
      byPowertrain,
    },
  };
}

export function loadLatestDeep(outDir: string): { path: string; data: DanawaDeepCatalog } {
  const files = readdirSync(outDir)
    .filter(
      (f) =>
        f.startsWith("danawa-private-catalog-deep-") &&
        f.endsWith(".json") &&
        !f.includes("checkpoint") &&
        !f.includes("enrich"),
    )
    .sort();
  if (!files.length) throw new Error("no deep catalog");
  const path = join(outDir, files.at(-1)!);
  return { path, data: JSON.parse(readFileSync(path, "utf8")) };
}

export function writeEnrichmentFile(cwd: string, data: EnrichedDeepCatalog) {
  const outDir = join(cwd, "workers/ingest/out");
  const path = join(outDir, `danawa-private-catalog-enrich-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}
