type StatsEnv = {
  DB?: D1Database;
  STATS_REPORT_TOKEN?: string;
};

export type SiteStatEvent = "page_view" | "download";

type SiteStatRow = {
  stats_date: string;
  event: SiteStatEvent;
  target: string;
  count: number;
};

const STATS_TIME_ZONE = "Asia/Taipei";
const MAX_TARGET_LENGTH = 256;
const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|preview|facebookexternalhit|slackbot|discordbot|twitterbot|telegrambot|whatsapp/i;

let statsSchemaReady: Promise<void> | null = null;

async function readStatsEnv(): Promise<StatsEnv> {
  let cloudflareEnv: StatsEnv | null = null;
  try {
    const cloudflare = (await import("cloudflare:workers")) as { env?: StatsEnv };
    cloudflareEnv = cloudflare.env || null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === "production") {
      console.warn("Stats Cloudflare environment is unavailable; using process env fallback.", { reason });
    }
  }

  return {
    DB: cloudflareEnv?.DB,
    STATS_REPORT_TOKEN: cloudflareEnv?.STATS_REPORT_TOKEN || process.env.STATS_REPORT_TOKEN,
  };
}

async function getStatsDb(): Promise<D1Database | null> {
  const env = await readStatsEnv();
  return env.DB || null;
}

function taipeiDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STATS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function dateDaysAgo(daysAgo: number): string {
  const value = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return taipeiDate(value);
}

function normalizeTarget(value: string): string {
  const trimmed = value.trim() || "/";
  return trimmed.replace(/\s+/g, " ").slice(0, MAX_TARGET_LENGTH);
}

function isLikelyBot(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") || "";
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

async function ensureStatsSchema(db: D1Database): Promise<void> {
  if (!statsSchemaReady) {
    statsSchemaReady = db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS site_daily_stats (
          stats_date TEXT NOT NULL,
          event TEXT NOT NULL,
          target TEXT NOT NULL DEFAULT '',
          count INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (stats_date, event, target)
        )
      `),
      db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_site_daily_stats_date_event
        ON site_daily_stats (stats_date, event)
      `),
      db.prepare("PRAGMA optimize"),
    ]).then(() => undefined);
  }
  await statsSchemaReady;
}

export async function recordSiteStat(
  request: Request,
  event: SiteStatEvent,
  target: string,
): Promise<{ recorded: boolean; reason?: string }> {
  if (isLikelyBot(request)) return { recorded: false, reason: "bot_filtered" };

  const db = await getStatsDb();
  if (!db) return { recorded: false, reason: "db_unavailable" };

  await ensureStatsSchema(db);
  const today = taipeiDate();
  const updatedAt = new Date().toISOString();
  await db
    .prepare(`
      INSERT INTO site_daily_stats (stats_date, event, target, count, updated_at)
      VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(stats_date, event, target)
      DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
    `)
    .bind(today, event, normalizeTarget(target), updatedAt)
    .run();

  return { recorded: true };
}

export async function getStatsReport(days = 14): Promise<{
  time_zone: string;
  today: string;
  days: Array<{ date: string; page_views: number; downloads: number }>;
  totals: { page_views: number; downloads: number };
}> {
  const db = await getStatsDb();
  if (!db) {
    return {
      time_zone: STATS_TIME_ZONE,
      today: taipeiDate(),
      days: [],
      totals: { page_views: 0, downloads: 0 },
    };
  }

  await ensureStatsSchema(db);
  const safeDays = Math.max(1, Math.min(Math.trunc(days), 90));
  const since = dateDaysAgo(safeDays - 1);
  const result = await db
    .prepare(`
      SELECT stats_date, event, target, count
      FROM site_daily_stats
      WHERE stats_date >= ?
      ORDER BY stats_date DESC, event ASC
    `)
    .bind(since)
    .all<SiteStatRow>();

  const rows = result.results || [];
  const byDate = new Map<string, { date: string; page_views: number; downloads: number }>();
  const totals = { page_views: 0, downloads: 0 };

  for (const row of rows) {
    const day = byDate.get(row.stats_date) || { date: row.stats_date, page_views: 0, downloads: 0 };
    if (row.event === "page_view") {
      day.page_views += Number(row.count || 0);
      totals.page_views += Number(row.count || 0);
    }
    if (row.event === "download") {
      day.downloads += Number(row.count || 0);
      totals.downloads += Number(row.count || 0);
    }
    byDate.set(row.stats_date, day);
  }

  return {
    time_zone: STATS_TIME_ZONE,
    today: taipeiDate(),
    days: Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date)),
    totals,
  };
}

export async function authorizeStatsReport(request: Request): Promise<boolean> {
  const env = await readStatsEnv();
  if (!env.STATS_REPORT_TOKEN) return true;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token") || "";
  const header = request.headers.get("authorization") || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return queryToken === env.STATS_REPORT_TOKEN || bearerToken === env.STATS_REPORT_TOKEN;
}
