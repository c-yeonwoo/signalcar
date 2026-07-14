/**
 * 다나와 자동차백과 — 개인/카탈로그 조사용 로컬 페처.
 *
 * 출력: workers/ingest/out/ 만 (gitignore). 제품 Supabase 적재 없음.
 * 쿠키 불필요.
 *
 * 탐색 맵:
 *   GET /auto/                          메인 (JS 네비)
 *   /service/navigatorNewcar.php?Work=brand&Type=buy
 *   /auto/?Work=brand&Brand={id}        브랜드별 모델 카드
 *   /service/navigatorNewcar.php?Work=model&Type=buy&Brand={id}
 *   /service/ajax_auto_model.php?Brand={id}  시리즈(옵션)
 *   /auto/?Work=model&Model={id}        모델 상세·트림
 */
const BASE = "https://mauto.danawa.com";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) App/iPhone/3.0.69 (Auto, 2)";

export type DanawaBrand = {
  brandId: string;
  name: string;
  group?: string; // 국산 | 수입
  logo?: string;
};

export type DanawaModelRef = {
  modelId: string;
  name: string;
  brandId: string;
  segment?: string;
  image?: string;
  href: string;
};

export type DanawaTrimRef = {
  lineupId: string;
  trimId: string;
  modelId: string;
  tcoPath: string;
};

export type DanawaModelSnapshot = {
  modelId: string;
  title: string;
  brandId?: string;
  nameHint?: string;
  url: string;
  trimRefs: DanawaTrimRef[];
  pricesWon: number[];
  fetchedAt: string;
};

export type DanawaFullCatalog = {
  source: "danawa-private";
  fetchedAt: string;
  brands: DanawaBrand[];
  models: DanawaModelRef[];
  stats: { brandCount: number; modelCount: number; byGroup: Record<string, number> };
};

function abs(href: string) {
  try {
    return new URL(href, BASE).toString();
  } catch {
    return href;
  }
}

async function getHtml(pathOrUrl: string, referer?: string): Promise<string> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,*/*",
      Referer: referer ?? `${BASE}/auto/`,
      "X-Requested-With": "XMLHttpRequest",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`danawa HTTP ${res.status} ${url}`);
  return await res.text();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function titleOf(html: string) {
  return html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() ?? "";
}

/** 네비게이터 브랜드 전체 (국산/수입) */
export async function fetchAllBrands(): Promise<DanawaBrand[]> {
  const html = await getHtml("/service/navigatorNewcar.php?Work=brand&Type=buy");
  const brands: DanawaBrand[] = [];
  const seen = new Set<string>();

  // group blocks: brand__title then following brand__item until next title/group end
  const parts = html.split(/<h3 class='brand__title'>/);
  for (const part of parts.slice(1)) {
    const group = part.match(/^([^<]+)/)?.[1]?.trim();
    for (const m of part.matchAll(
      /data-brand='(\d+)'[\s\S]{0,280}?alt='([^']+)'(?:[\s\S]{0,120}?src='([^']+)')?/g,
    )) {
      const brandId = m[1]!;
      if (seen.has(brandId)) continue;
      seen.add(brandId);
      const logoMatch = part.includes(`data-brand='${brandId}'`)
        ? part
            .slice(part.indexOf(`data-brand='${brandId}'`))
            .match(/src='([^']+brand[^']+)'/)
        : null;
      brands.push({
        brandId,
        name: m[2]!,
        group,
        logo: logoMatch?.[1] ? abs(logoMatch[1].startsWith("//") ? `https:${logoMatch[1]}` : logoMatch[1]) : undefined,
      });
    }
  }

  // fallback simpler parse
  if (!brands.length) {
    for (const m of html.matchAll(/data-brand='(\d+)'[\s\S]{0,200}?alt='([^']+)'/g)) {
      if (seen.has(m[1]!)) continue;
      seen.add(m[1]!);
      brands.push({ brandId: m[1]!, name: m[2]! });
    }
  }

  return brands;
}

/** 브랜드 백과 페이지에서 모델 카드 추출 (현재 세대 ID) */
export async function fetchBrandEncyclopediaModels(
  brandId: string,
  brandName?: string,
): Promise<DanawaModelRef[]> {
  const html = await getHtml(`/auto/?Work=brand&Brand=${brandId}`);
  const models: DanawaModelRef[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(/\/auto\/\?Work=model&Model=(\d+)/g)) {
    const modelId = m[1]!;
    if (seen.has(modelId)) continue;
    const chunk = html.slice(m.index!, m.index! + 500);
    const alt = chunk.match(/alt=['"]([^'"]+)['"]/)?.[1]?.trim();
    const nameSpan = chunk.match(/class=['"][^'"]*name[^'"]*['"][^>]*>([^<]+)/)?.[1]?.trim();
    const name = (alt || nameSpan || "").replace(/\s+/g, " ").trim();
    if (!name || /^(상세|더보기|비교|홈)$/.test(name)) continue;
    seen.add(modelId);
    const img = chunk.match(/src=['"]([^'"]*model[^'"]+)['"]/)?.[1];
    models.push({
      modelId,
      name,
      brandId,
      image: img ? abs(img.startsWith("//") ? `https:${img}` : img) : undefined,
      href: abs(`/auto/?Work=model&Model=${modelId}`),
    });
  }

  // 구매 네비 보강 (세그먼트)
  try {
    const nav = await getHtml(
      `/service/navigatorNewcar.php?Work=model&Type=buy&Brand=${brandId}`,
    );
    let segment: string | undefined;
    for (const block of nav.split(/<h3 class='classify__title'>/)) {
      const seg = block.match(/^([^<]+)/)?.[1]?.trim();
      if (seg && !block.startsWith("<")) segment = seg;
      for (const m of block.matchAll(
        /Model=(\d+)[\s\S]{0,200}?alt='([^']+)'[\s\S]{0,80}?<span class='name'>([^<]+)<\/span>/g,
      )) {
        const modelId = m[1]!;
        const name = m[3]!.trim() || m[2]!.trim();
        const existing = models.find((x) => x.modelId === modelId);
        if (existing) {
          existing.segment = segment;
          if (!existing.name) existing.name = name;
        } else if (!seen.has(modelId)) {
          seen.add(modelId);
          models.push({
            modelId,
            name,
            brandId,
            segment,
            href: abs(`/auto/?Work=model&Model=${modelId}`),
          });
        }
      }
    }
  } catch {
    /* optional */
  }

  void brandName;
  return models;
}

export async function fetchDanawaBrand(brandId: string) {
  const models = await fetchBrandEncyclopediaModels(brandId);
  const html = await getHtml(`/auto/?Work=brand&Brand=${brandId}`);
  return {
    brandId,
    title: titleOf(html),
    url: `${BASE}/auto/?Work=brand&Brand=${brandId}`,
    models: models.map((m) => ({
      modelId: m.modelId,
      name: m.name,
      href: m.href,
    })),
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchDanawaModel(modelId: string): Promise<DanawaModelSnapshot> {
  const url = `${BASE}/auto/?Work=model&Model=${modelId}`;
  const main = await getHtml(url);
  const brandId = main.match(/data-brandcode=['"](\d+)['"]/i)?.[1];
  const nameHint = main.match(/data-namenew=['"]([^'"]+)['"]/i)?.[1];

  const trimRefs: DanawaTrimRef[] = [];
  const seen = new Set<string>();
  for (const m of main.matchAll(
    /\/next\/auto\/tco\?lineup=(\d+)&trim=(\d+)&Model=(\d+)/g,
  )) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    trimRefs.push({
      lineupId: m[1]!,
      trimId: m[2]!,
      modelId: m[3]!,
      tcoPath: m[0]!,
    });
  }

  let pricesWon: number[] = [];
  try {
    const spec = await getHtml(
      `/service/ajax_spec_mobile.php?Type=spec&Model=${modelId}`,
      url,
    );
    const raw = [...spec.matchAll(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/g)].map((x) =>
      Number(x[1]!.replace(/,/g, "")),
    );
    pricesWon = [...new Set(raw.filter((n) => n >= 5_000_000 && n <= 500_000_000))].sort(
      (a, b) => a - b,
    );
  } catch {
    /* optional */
  }

  return {
    modelId,
    title: titleOf(main),
    brandId,
    nameHint,
    url,
    trimRefs,
    pricesWon,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchDanawaBrandDeep(
  brandId: string,
  opts?: { maxModels?: number; delayMs?: number },
) {
  const maxModels = opts?.maxModels ?? 20;
  const delayMs = opts?.delayMs ?? 400;
  const brand = await fetchDanawaBrand(brandId);
  const models = [];
  for (const ref of brand.models.slice(0, maxModels)) {
    models.push(await fetchDanawaModel(ref.modelId));
    if (delayMs > 0) await sleep(delayMs);
  }
  return { brand, models };
}

/** 전 브랜드 × 백과 모델 카탈로그 */
export async function fetchFullEncyclopediaCatalog(opts?: {
  delayMs?: number;
  brandIds?: string[];
  onProgress?: (msg: string) => void;
}): Promise<DanawaFullCatalog> {
  const delayMs = opts?.delayMs ?? 250;
  const brandsAll = await fetchAllBrands();
  const brands = opts?.brandIds?.length
    ? brandsAll.filter((b) => opts.brandIds!.includes(b.brandId))
    : brandsAll;

  opts?.onProgress?.(`brands=${brands.length}`);
  const models: DanawaModelRef[] = [];
  const byGroup: Record<string, number> = {};

  for (const b of brands) {
    byGroup[b.group ?? "기타"] = (byGroup[b.group ?? "기타"] ?? 0) + 1;
    try {
      const ms = await fetchBrandEncyclopediaModels(b.brandId, b.name);
      for (const m of ms) models.push(m);
      opts?.onProgress?.(
        `${b.name}(${b.brandId}): ${ms.length} models (total ${models.length})`,
      );
    } catch (e) {
      opts?.onProgress?.(`FAIL ${b.name}(${b.brandId}): ${e}`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  // dedupe models by id (keep first)
  const uniq: DanawaModelRef[] = [];
  const seen = new Set<string>();
  for (const m of models) {
    if (seen.has(m.modelId)) continue;
    seen.add(m.modelId);
    uniq.push(m);
  }

  return {
    source: "danawa-private",
    fetchedAt: new Date().toISOString(),
    brands,
    models: uniq,
    stats: {
      brandCount: brands.length,
      modelCount: uniq.length,
      byGroup,
    },
  };
}

export type DanawaDeepCatalog = {
  source: "danawa-private-deep";
  fetchedAt: string;
  catalog: DanawaFullCatalog;
  details: DanawaModelSnapshot[];
  errors: Array<{ modelId: string; name?: string; error: string }>;
  stats: {
    requested: number;
    ok: number;
    failed: number;
    withPrice: number;
    withTrim: number;
  };
};

/** 카탈로그의 모든 모델에 대해 트림·가격 deep 확보 */
export async function fetchFullCatalogDeep(opts?: {
  catalog?: DanawaFullCatalog;
  delayMs?: number;
  onProgress?: (msg: string) => void;
  /** 이미 확보한 details — resume용 */
  existingDetails?: DanawaModelSnapshot[];
  /** N건마다 중간 저장 */
  checkpointEvery?: number;
  onCheckpoint?: (partial: {
    details: DanawaModelSnapshot[];
    errors: DanawaDeepCatalog["errors"];
  }) => void;
}): Promise<DanawaDeepCatalog> {
  const delayMs = opts?.delayMs ?? 350;
  const checkpointEvery = opts?.checkpointEvery ?? 25;
  const catalog =
    opts?.catalog ??
    (await fetchFullEncyclopediaCatalog({
      delayMs: 200,
      onProgress: opts?.onProgress,
    }));

  const done = new Map<string, DanawaModelSnapshot>();
  for (const d of opts?.existingDetails ?? []) done.set(d.modelId, d);

  const details: DanawaModelSnapshot[] = [...done.values()];
  const errors: DanawaDeepCatalog["errors"] = [];
  const pending = catalog.models.filter((m) => !done.has(m.modelId));
  opts?.onProgress?.(
    `deep: total=${catalog.models.length} done=${done.size} pending=${pending.length}`,
  );

  let i = 0;
  for (const ref of pending) {
    i++;
    try {
      const snap = await fetchDanawaModel(ref.modelId);
      if (!snap.brandId) snap.brandId = ref.brandId;
      if (!snap.nameHint) snap.nameHint = ref.name;
      details.push(snap);
      done.set(ref.modelId, snap);
      if (i % 10 === 0 || i === pending.length) {
        opts?.onProgress?.(
          `deep ${i}/${pending.length} last=${ref.name}(${ref.modelId}) trims=${snap.trimRefs.length} prices=${snap.pricesWon.length}`,
        );
      }
    } catch (e) {
      errors.push({
        modelId: ref.modelId,
        name: ref.name,
        error: String(e),
      });
      opts?.onProgress?.(`FAIL ${ref.name}(${ref.modelId}): ${e}`);
    }
    if (checkpointEvery > 0 && i % checkpointEvery === 0) {
      opts?.onCheckpoint?.({ details: [...details], errors: [...errors] });
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  const withPrice = details.filter((d) => d.pricesWon.length > 0).length;
  const withTrim = details.filter((d) => d.trimRefs.length > 0).length;

  return {
    source: "danawa-private-deep",
    fetchedAt: new Date().toISOString(),
    catalog,
    details,
    errors,
    stats: {
      requested: catalog.models.length,
      ok: details.length,
      failed: errors.length,
      withPrice,
      withTrim,
    },
  };
}
