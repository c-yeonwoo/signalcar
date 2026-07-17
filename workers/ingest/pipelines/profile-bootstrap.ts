/**
 * vehicles/trims 중 car_profiles 가 없는 차종에 stub 프로필을 만들어
 * 홈·탐색·promo-etl 싱크 대상을 늘린다.
 * 실거래 표본은 0 — UI는 “수집 중”으로 정직하게 표시.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

type TrimRow = {
  id: string;
  name: string;
  slug: string | null;
  base_price: number | null;
  vehicle: {
    id: string;
    slug: string | null;
    model_name: string;
    fuel_type: string | null;
    brand: { name: string } | null;
  } | null;
};

function bodyLabel(fuel: string | null, model: string): string {
  if (/ev|electric|아이오닉|넥쏘/i.test(`${fuel} ${model}`)) return "전기/수소";
  if (/스타리아|카니발|리무진/i.test(model)) return "MPV";
  if (/SUV|싼타페|투싼|팰리세이드|코나|쏘렌토|스포티지|셀토스/i.test(model)) {
    return "SUV";
  }
  return "승용";
}

function stubSlug(vehicleSlug: string | null, modelName: string, trimId: string): string {
  const base =
    (vehicleSlug && vehicleSlug.trim()) ||
    modelName
      .toLowerCase()
      .replace(/[^\w가-힣]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  return base || `trim-${trimId.slice(0, 8)}`;
}

export async function bootstrapCarProfiles(opts?: {
  dryRun?: boolean;
  cwd?: string;
  limit?: number;
  /** false면 published=false 로만 생성 (검수용) */
  publish?: boolean;
}) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const cwd = opts?.cwd ?? process.cwd();
  const limit = opts?.limit ?? 40;
  const publish = opts?.publish ?? true;

  const { data: existing, error: exErr } = await sb.from("car_profiles").select("trim_id, slug");
  if (exErr) throw exErr;
  const haveTrim = new Set((existing ?? []).map((r) => r.trim_id as string));
  const haveSlug = new Set((existing ?? []).map((r) => r.slug as string));

  const { data: trims, error: tErr } = await sb
    .from("trims")
    .select(
      "id, name, slug, base_price, vehicle:vehicles(id, slug, model_name, fuel_type, brand:brands(name))",
    )
    .order("base_price", { ascending: true })
    .limit(500);
  if (tErr) throw tErr;

  // vehicle에 이미 프로필이 있는지
  const vehicleHasProfile = new Set<string>();
  for (const t of (trims ?? []) as unknown as TrimRow[]) {
    if (t.vehicle?.id && haveTrim.has(t.id)) vehicleHasProfile.add(t.vehicle.id);
  }

  // vehicle당 프로필 1개 — 가장 싼 트림 우선
  const bestByVehicle = new Map<string, TrimRow>();
  for (const t of (trims ?? []) as unknown as TrimRow[]) {
    if (!t.vehicle?.id) continue;
    if (haveTrim.has(t.id)) continue;
    if (vehicleHasProfile.has(t.vehicle.id)) continue;
    if (!bestByVehicle.has(t.vehicle.id)) bestByVehicle.set(t.vehicle.id, t);
  }

  const stubs: Record<string, unknown>[] = [];
  for (const [vid, t] of bestByVehicle) {
    if (vehicleHasProfile.has(vid)) continue;
    if (stubs.length >= limit) break;

    let slug = stubSlug(t.vehicle?.slug ?? null, t.vehicle?.model_name ?? t.name, t.id);
    if (haveSlug.has(slug) || stubs.some((s) => s.slug === slug)) {
      slug = `${slug}-${t.id.slice(0, 6)}`;
    }

    const brand = t.vehicle?.brand?.name ?? "";
    const model = t.vehicle?.model_name ?? t.name;
    stubs.push({
      trim_id: t.id,
      slug,
      body_type_label: bodyLabel(t.vehicle?.fuel_type ?? null, model),
      headline: "데이터 모으는 중",
      coach:
        "실계약 표본이 아직 얇아요. 이달 공식 프로모와 정가를 기준으로 타이밍을 보세요. 계약 공유가 쌓이면 시그널이 정확해집니다.",
      image_color: "from-slate-400 to-slate-600",
      fuel_efficiency: null,
      insurance_annual: null,
      benefits: [],
      promo_label: "프로모션 확인 중",
      promo_amount: 0,
      promo_note: "",
      facelift: null,
      published: publish,
      updated_at: new Date().toISOString(),
    });
  }

  const outDir = join(cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `profile-bootstrap-${Date.now()}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        publish,
        stats: { candidates: stubs.length, existingProfiles: haveTrim.size },
        stubs: stubs.map((s) => ({
          slug: s.slug,
          trim_id: s.trim_id,
          published: s.published,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `[profile-bootstrap] stubs=${stubs.length} existing=${haveTrim.size} → ${outPath}`,
  );

  if (opts?.dryRun || !stubs.length) {
    return {
      dryRun: Boolean(opts?.dryRun),
      created: 0,
      candidates: stubs.length,
      outPath,
    };
  }

  const { error: insErr } = await sb.from("car_profiles").upsert(stubs, {
    onConflict: "trim_id",
  });
  if (insErr) throw insErr;

  return {
    dryRun: false as const,
    created: stubs.length,
    candidates: stubs.length,
    outPath,
  };
}
