/**
 * 공식 뉴스룸 HTML에서 제목·링크 인덱싱 (본문 전문 수집 아님).
 */
import { INGEST_SOURCES } from "../sources";

export type NewsDoc = {
  sourceId: string;
  brandHint: string;
  title: string;
  url: string;
  fetchedAt: string;
};

const UA =
  "Mozilla/5.0 (compatible; SignalCarIngest/0.1; +https://github.com/c-yeonwoo/signalcar)";

const LINK_RE = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function brandFromSource(id: string): string {
  if (id.startsWith("hyundai")) return "현대";
  if (id.startsWith("kia")) return "기아";
  if (id.startsWith("genesis")) return "제네시스";
  return "unknown";
}

function absUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeArticle(href: string, title: string) {
  if (title.length < 8 || title.length > 160) return false;
  if (/^(홈|로그인|더보기|이전|다음|공유|닫기)$/i.test(title)) return false;
  return /news|press|media|story|article|보도|뉴스/i.test(href) || title.length >= 12;
}

export async function indexOfficialNews(opts?: {
  sourceIds?: string[];
  fetchImpl?: typeof fetch;
  limitPerSource?: number;
}): Promise<NewsDoc[]> {
  const fetchFn = opts?.fetchImpl ?? fetch;
  const limit = opts?.limitPerSource ?? 40;
  const sources = INGEST_SOURCES.filter(
    (s) =>
      s.kind === "official_news" &&
      s.legal === "allowed" &&
      (!opts?.sourceIds || opts.sourceIds.includes(s.id)),
  );

  const out: NewsDoc[] = [];
  const seen = new Set<string>();
  const fetchedAt = new Date().toISOString();

  for (const src of sources) {
    console.log(`[news-index] GET ${src.url}`);
    const res = await fetchFn(src.url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
    });
    if (!res.ok) {
      console.warn(`[news-index] ${src.id} HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    let n = 0;
    for (const m of html.matchAll(LINK_RE)) {
      const href = m[1]!;
      const title = stripTags(m[2]!);
      if (!looksLikeArticle(href, title)) continue;
      const url = absUrl(src.url, href);
      if (seen.has(url)) continue;
      if (!url.startsWith("http")) continue;
      seen.add(url);
      out.push({
        sourceId: src.id,
        brandHint: brandFromSource(src.id),
        title,
        url,
        fetchedAt,
      });
      n++;
      if (n >= limit) break;
    }
    console.log(`[news-index] ${src.id}: ${n} items`);
  }

  return out;
}
