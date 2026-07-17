/**
 * signal_alert_queue pending → 이메일 발송.
 * - RESEND_API_KEY 없으면 dry-run과 동일하게 미리보기만 저장
 * - --weekly: digest_signups 전체에 현재 BUY 시그널 요약 큐잉 후 발송 시도
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type QueueRow = {
  id: string;
  email: string | null;
  user_id: string | null;
  trim_id: string | null;
  car_slug: string | null;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
};

type MailPreview = {
  to: string;
  subject: string;
  html: string;
  queueIds: string[];
  kind: string;
};

const APP_BASE =
  process.env.SIGNALCAR_APP_URL?.replace(/\/$/, "") || "https://signalcar.lovable.app";

function renderBuyTransitionEmail(
  to: string,
  items: { slug: string | null; from: string; toVerdict: string; score: number }[],
): MailPreview {
  const lines = items
    .map((i) => {
      const name = i.slug ?? "관심 차량";
      const href = i.slug ? `${APP_BASE}/car/${i.slug}` : APP_BASE;
      return `<li style="margin:0 0 10px"><a href="${href}" style="color:#0f172a;font-weight:600;text-decoration:none">${name}</a><br/><span style="color:#64748b;font-size:13px">${i.from} → <b style="color:#16a34a">BUY</b> (score ${i.score})</span></li>`;
    })
    .join("");
  const subject =
    items.length === 1
      ? `시그널카 · ${items[0]!.slug ?? "관심 차"} BUY 전환`
      : `시그널카 · BUY 전환 ${items.length}건`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;font-weight:700;color:#2563eb;letter-spacing:.04em">SIGNALCAR</p>
    <h1 style="margin:8px 0 4px;font-size:20px;color:#0f172a">지금 사도 될까? 시그널이 바뀌었어요</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.5">WAIT/HOLD 에서 BUY 로 전환된 차종입니다. 표본·프로모를 다시 확인해 보세요.</p>
    <ul style="padding-left:18px;margin:0 0 20px">${lines}</ul>
    <a href="${APP_BASE}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:600">시그널카 열기</a>
    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8">수신: ${to} · 구독 해제는 앱 마이 페이지에서</p>
  </div></body></html>`;
  return { to, subject, html, queueIds: [], kind: "buy_transition_digest" };
}

function renderWeeklyDigestEmail(
  to: string,
  buys: { slug: string; score: number; headline: string }[],
): MailPreview {
  const lines = buys.length
    ? buys
        .map(
          (b) =>
            `<li style="margin:0 0 10px"><a href="${APP_BASE}/car/${b.slug}" style="color:#0f172a;font-weight:600;text-decoration:none">${b.slug}</a><br/><span style="color:#64748b;font-size:13px">${b.headline} · score ${b.score}</span></li>`,
        )
        .join("")
    : `<li style="color:#64748b">이번 주 강한 BUY 전환은 없어요. 관심 차 목표가 알림을 켜 두세요.</li>`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e2e8f0">
    <p style="margin:0;font-size:12px;font-weight:700;color:#2563eb;letter-spacing:.04em">SIGNALCAR WEEKLY</p>
    <h1 style="margin:8px 0 4px;font-size:20px;color:#0f172a">이번 주 구매 타이밍 요약</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.5">공식 프로모·실거래 시그널 기준 주간 다이제스트입니다.</p>
    <ul style="padding-left:18px;margin:0 0 20px">${lines}</ul>
    <a href="${APP_BASE}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 16px;border-radius:12px;font-size:14px;font-weight:600">관심 차 확인</a>
    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8">수신: ${to}</p>
  </div></body></html>`;
  return {
    to,
    subject: `시그널카 주간 다이제스트 · BUY ${buys.length}대`,
    html,
    queueIds: [],
    kind: "weekly_digest",
  };
}

async function sendViaResend(mail: MailPreview): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SignalCar <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: json.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, id: json.id };
}

async function enqueueWeekly(
  sb: SupabaseClient,
  dryRun: boolean,
): Promise<{ queued: number; previews: MailPreview[] }> {
  const { data: digests } = await sb.from("digest_signups").select("email, user_id");
  const { data: features } = await sb
    .from("car_features_daily")
    .select("trim_id, timing_verdict, timing_score, feature_date")
    .eq("timing_verdict", "buy")
    .order("feature_date", { ascending: false })
    .limit(200);

  const latestByTrim = new Map<
    string,
    { trim_id: string; timing_score: number; feature_date: string }
  >();
  for (const f of features ?? []) {
    const tid = f.trim_id as string;
    if (!latestByTrim.has(tid)) {
      latestByTrim.set(tid, {
        trim_id: tid,
        timing_score: Number(f.timing_score ?? 0),
        feature_date: f.feature_date as string,
      });
    }
  }
  const top = [...latestByTrim.values()]
    .sort((a, b) => b.timing_score - a.timing_score)
    .slice(0, 8);
  const trimIds = top.map((t) => t.trim_id);
  const { data: profiles } = trimIds.length
    ? await sb.from("car_profiles").select("trim_id, slug, headline").in("trim_id", trimIds)
    : { data: [] };
  const byTrim = new Map(
    (profiles ?? []).map((p) => [
      p.trim_id as string,
      { slug: p.slug as string, headline: (p.headline as string) || "BUY 시그널" },
    ]),
  );
  const buys = top.map((t) => ({
    slug: byTrim.get(t.trim_id)?.slug ?? t.trim_id.slice(0, 8),
    score: t.timing_score,
    headline: byTrim.get(t.trim_id)?.headline ?? "BUY 시그널",
  }));

  const previews: MailPreview[] = [];
  const rows: Record<string, unknown>[] = [];
  for (const d of digests ?? []) {
    const email = d.email as string;
    if (!email) continue;
    const mail = renderWeeklyDigestEmail(email, buys);
    previews.push(mail);
    rows.push({
      user_id: d.user_id ?? null,
      email,
      trim_id: top[0]?.trim_id ?? null,
      car_slug: buys[0]?.slug ?? null,
      kind: "weekly_digest",
      payload: { buys, feature_date: top[0]?.feature_date ?? null },
      status: "pending",
    });
  }

  if (!dryRun && rows.length) {
    // 최근 6일 동일 weekly 있으면 스킵
    const since = new Date(Date.now() - 6 * 86400_000).toISOString();
    const { data: existing } = await sb
      .from("signal_alert_queue")
      .select("email")
      .eq("kind", "weekly_digest")
      .gte("created_at", since);
    const have = new Set((existing ?? []).map((e) => e.email as string));
    const toInsert = rows.filter((r) => !have.has(r.email as string));
    if (toInsert.length) {
      const { error } = await sb.from("signal_alert_queue").insert(toInsert);
      if (error) throw error;
    }
    return { queued: toInsert.length, previews };
  }

  return { queued: rows.length, previews };
}

export async function sendPendingAlerts(opts?: {
  dryRun?: boolean;
  cwd?: string;
  limit?: number;
  weekly?: boolean;
}) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const cwd = opts?.cwd ?? process.cwd();
  const limit = opts?.limit ?? 100;
  const forceDry = opts?.dryRun || !process.env.RESEND_API_KEY;

  let weeklyQueued = 0;
  let weeklyPreviews: MailPreview[] = [];
  if (opts?.weekly) {
    const w = await enqueueWeekly(sb, Boolean(opts.dryRun));
    weeklyQueued = w.queued;
    weeklyPreviews = w.previews;
  }

  const { data: pending, error } = await sb
    .from("signal_alert_queue")
    .select("id, email, user_id, trim_id, car_slug, kind, payload, status, created_at")
    .eq("status", "pending")
    .not("email", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  const rows = (pending ?? []) as QueueRow[];
  // group by email
  const byEmail = new Map<string, QueueRow[]>();
  for (const r of rows) {
    if (!r.email) continue;
    const arr = byEmail.get(r.email) ?? [];
    arr.push(r);
    byEmail.set(r.email, arr);
  }

  const mails: MailPreview[] = [];
  // dry --weekly 미리보기는 큐에 아직 없을 수 있음
  if (opts?.dryRun && opts?.weekly) {
    mails.push(...weeklyPreviews);
  }

  for (const [email, group] of byEmail) {
    const weeklyRows = group.filter((g) => g.kind === "weekly_digest");
    const transitions = group.filter((g) => g.kind !== "weekly_digest");

    if (transitions.length) {
      const items = transitions.map((g) => ({
        slug: g.car_slug,
        from: String(g.payload?.from ?? "wait"),
        toVerdict: String(g.payload?.to ?? "buy"),
        score: Number(g.payload?.score ?? 0),
      }));
      const mail = renderBuyTransitionEmail(email, items);
      mail.queueIds = transitions.map((g) => g.id);
      mails.push(mail);
    }

    if (weeklyRows.length) {
      const buys =
        (weeklyRows[0]!.payload?.buys as { slug: string; score: number; headline: string }[]) ??
        [];
      const mail = renderWeeklyDigestEmail(email, buys);
      mail.queueIds = weeklyRows.map((g) => g.id);
      mails.push(mail);
    }
  }

  const outDir = join(cwd, "workers/ingest/out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `send-alerts-${Date.now()}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        dryRun: forceDry,
        hasResendKey: Boolean(process.env.RESEND_API_KEY),
        weeklyQueued,
        pending: rows.length,
        mails: mails.map((m) => ({
          to: m.to,
          subject: m.subject,
          kind: m.kind,
          queueIds: m.queueIds,
          html: m.html,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `[send-alerts] pending=${rows.length} mails=${mails.length} weeklyQueued=${weeklyQueued} dry=${forceDry} → ${outPath}`,
  );

  if (forceDry) {
    return {
      dryRun: true as const,
      pending: rows.length,
      mails: mails.length,
      weeklyQueued,
      sent: 0,
      failed: 0,
      outPath,
    };
  }

  let sent = 0;
  let failed = 0;
  for (const mail of mails) {
    if (!mail.queueIds.length) continue;
    const result = await sendViaResend(mail);
    if (result.ok) {
      sent += 1;
      await sb
        .from("signal_alert_queue")
        .update({ status: "sent" })
        .in("id", mail.queueIds);
    } else {
      failed += 1;
      console.warn("[send-alerts] fail", mail.to, result.error);
      await sb
        .from("signal_alert_queue")
        .update({ status: "failed" })
        .in("id", mail.queueIds);
    }
  }

  return {
    dryRun: false as const,
    pending: rows.length,
    mails: mails.length,
    weeklyQueued,
    sent,
    failed,
    outPath,
  };
}
