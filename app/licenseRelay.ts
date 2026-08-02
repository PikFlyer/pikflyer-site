export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

type RelayEnv = {
  CREEM_API_KEY?: string;
  CREEM_TEST_MODE?: string;
  CREEM_PRODUCT_ID?: string;
  INVITE_ADMIN_TOKEN?: string;
  DB?: D1Database;
};

type InviteCodeRow = {
  id: string;
  code_hash: string;
  label: string | null;
  duration_days: number;
  max_devices: number;
  bound_device_hash: string | null;
  instance_id: string | null;
  activated_at: string | null;
  expires_at: string | null;
  disabled_at: string | null;
  created_at: string;
  last_validated_at: string | null;
};

type TrialDeviceRow = {
  device_hash: string;
  trial_started_at: string;
  trial_expires_at: string;
  created_at: string;
  last_seen_at: string;
};

type TrialUsageRow = {
  used: number;
};

type RateLimitRow = {
  count: number;
  reset_at: number;
};

type LicenseCacheRow = {
  valid_until: string;
};

type PoiUsageRow = {
  used: number;
  reset_at: number;
};

type StarterPackRow = {
  pack_id: string;
  seed: string;
  count: number;
  created_at: string;
  last_returned_at: string | null;
};

const INVITE_CODE_PREFIX = "PF";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const OWNER_DEVICE_HASHES = new Set([
  "ea56499f3e5c78465c3bccebb78a342cf37c8e73ea60760efd75b1714f95d619",
]);
const TRIAL_DAYS = 7;
const TRIAL_DAILY_LIMITS: Record<string, number> = {
  teleport: 20,
  dice: 30,
  citywalk: 3,
  manual_batch: 3,
};
const POST_TRIAL_DAILY_LIMITS: Record<string, number> = {
  teleport: 10,
  dice: 15,
  citywalk: 1,
  manual_batch: 0,
};
const LATEST_ANDROID_VERSION = "2.0.8";
const MIN_ANDROID_VERSION = "1.0.0";
const LATEST_ANDROID_RELEASED_AT = "2026-08-02T14:44:13.000Z";
const ANDROID_UPDATE_GRACE_DAYS = 30;
const ANDROID_DOWNLOAD_URL = "https://www.pikflyer.app/downloads/pikflyer-xiaochibang-android-v2.0.8.apk";
const ANDROID_UPDATE_ANNOUNCEMENT_ID = "android-2.0.8-trial-first-use-and-copy-fixes";
const PAID_POI_HOURLY_LIMIT = 300;
const PAID_POI_DAILY_LIMIT = 2000;
const STARTER_PACK_SIZE = 100;

let licenseSchemaReady: Promise<void> | null = null;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("content-type must be application/json");
  }

  const text = await request.text();
  if (!text || text.length > 4096) {
    throw new Error("request body is empty or too large");
  }

  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function requireString(value: unknown, name: string, max = 256): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > max) {
    throw new Error(`${name} is too long`);
  }
  return normalized;
}

async function getRelayEnv(): Promise<RelayEnv> {
  try {
    const cloudflare = (await import("cloudflare:workers")) as { env?: RelayEnv };
    return cloudflare.env || {};
  } catch {
    return {
      CREEM_API_KEY: process.env.CREEM_API_KEY,
      CREEM_TEST_MODE: process.env.CREEM_TEST_MODE,
      CREEM_PRODUCT_ID: process.env.CREEM_PRODUCT_ID,
      INVITE_ADMIN_TOKEN: process.env.INVITE_ADMIN_TOKEN,
    };
  }
}

async function getD1(): Promise<D1Database | null> {
  const relayEnv = await getRelayEnv();
  return relayEnv.DB || null;
}

async function ensureLicenseSchema(db: D1Database): Promise<void> {
  licenseSchemaReady ||= db
    .batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS invite_codes (
        id TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL UNIQUE,
        label TEXT,
        duration_days INTEGER NOT NULL DEFAULT 180,
        max_devices INTEGER NOT NULL DEFAULT 1,
        bound_device_hash TEXT,
        instance_id TEXT UNIQUE,
        activated_at TEXT,
        expires_at TEXT,
        disabled_at TEXT,
        created_at TEXT NOT NULL,
        last_validated_at TEXT
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS invite_codes_code_hash_idx ON invite_codes (code_hash)"),
      db.prepare("CREATE INDEX IF NOT EXISTS invite_codes_instance_id_idx ON invite_codes (instance_id)"),
      db.prepare("CREATE INDEX IF NOT EXISTS invite_codes_expires_at_idx ON invite_codes (expires_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS trial_devices (
        device_hash TEXT PRIMARY KEY,
        trial_started_at TEXT NOT NULL,
        trial_expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS trial_usage (
        device_hash TEXT NOT NULL,
        usage_date TEXT NOT NULL,
        feature TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (device_hash, usage_date, feature)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS trial_devices_expires_at_idx ON trial_devices (trial_expires_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS trial_usage_device_date_idx ON trial_usage (device_hash, usage_date)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS rate_limits (
        key_hash TEXT NOT NULL,
        scope TEXT NOT NULL,
        bucket INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        reset_at INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (key_hash, scope, bucket)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits (reset_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS license_validation_cache (
        credential_hash TEXT NOT NULL,
        instance_id TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (credential_hash, instance_id)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS license_validation_cache_valid_until_idx ON license_validation_cache (valid_until)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS poi_return_usage (
        subject_hash TEXT NOT NULL,
        scope TEXT NOT NULL,
        bucket TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        reset_at INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (subject_hash, scope, bucket)
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS poi_return_usage_reset_idx ON poi_return_usage (reset_at)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS starter_packs (
        device_hash TEXT PRIMARY KEY,
        pack_id TEXT NOT NULL UNIQUE,
        seed TEXT NOT NULL,
        count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_returned_at TEXT
      )`),
    ])
    .then(() => undefined);
  return licenseSchemaReady;
}

function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function looksLikeInviteCode(value: string): boolean {
  return normalizeInviteCode(value).startsWith(`${INVITE_CODE_PREFIX}-`);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function inviteCodeHash(code: string): Promise<string> {
  return sha256Hex(`pikflyer-invite-v1:${normalizeInviteCode(code)}`);
}

async function deviceHashFromBody(body: Record<string, unknown>): Promise<string> {
  const raw = requireString(body.device_id || body.instance_name, "device_id", 512);
  return sha256Hex(`pikflyer-device-v1:${raw}`);
}

function inviteInstanceId(codeHash: string, deviceHash: string): string {
  return `invite_${codeHash.slice(0, 16)}_${deviceHash.slice(0, 16)}`;
}

function addDaysIso(base: Date, days: number): string {
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return next.toISOString();
}

function isExpired(expiresAt: string | null, now = new Date()): boolean {
  return Boolean(expiresAt && Date.parse(expiresAt) <= now.getTime());
}

function taipeiDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function androidUpdatePayload(body: Record<string, unknown>, now = new Date()): Record<string, unknown> {
  const currentVersion = typeof body.app_version === "string" ? body.app_version.trim() : "";
  const releaseMs = Date.parse(LATEST_ANDROID_RELEASED_AT);
  const ageDays = Number.isFinite(releaseMs)
    ? Math.floor(Math.max(0, now.getTime() - releaseMs) / (24 * 60 * 60 * 1000))
    : 0;
  const hasVersion = currentVersion !== "";
  const updateAvailable = hasVersion && compareVersions(currentVersion, LATEST_ANDROID_VERSION) < 0;
  const belowMinimum = hasVersion && compareVersions(currentVersion, MIN_ANDROID_VERSION) < 0;
  const updateRequired = belowMinimum || (updateAvailable && ageDays >= ANDROID_UPDATE_GRACE_DAYS);
  return {
    success: true,
    platform: "android",
    current_version: currentVersion || null,
    latest_version: LATEST_ANDROID_VERSION,
    min_supported_version: MIN_ANDROID_VERSION,
    latest_released_at: LATEST_ANDROID_RELEASED_AT,
    update_available: updateAvailable,
    update_required: updateRequired,
    force_after_days: ANDROID_UPDATE_GRACE_DAYS,
    days_since_latest_release: ageDays,
    announcement_id: ANDROID_UPDATE_ANNOUNCEMENT_ID,
    title: updateRequired ? "請更新 Pik Flyer-小翅膀" : "Pik Flyer-小翅膀 有新版",
    message: "更新流程改善：正式版會偵測舊測試版並引導移除，避免手機桌面同時出現兩個小翅膀。",
    download_url: ANDROID_DOWNLOAD_URL,
  };
}

function enforceAndroidUpdate(body: Record<string, unknown>): Response | null {
  const platform = typeof body.platform === "string" ? body.platform.toLowerCase() : "";
  const appVersion = typeof body.app_version === "string" ? body.app_version.trim() : "";
  if (platform !== "android" && appVersion === "") return null;
  const update = androidUpdatePayload(body);
  if (!update.update_required) return null;
  return jsonResponse({
    success: false,
    allowed: false,
    code: "update_required",
    error: "這個版本已超過更新寬限期，請下載最新版後再使用。",
    update,
  }, 426);
}

function clientIdentity(request: Request): string {
  const forwardedFor = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")
    || "unknown-ip";
  const userAgent = (request.headers.get("user-agent") || "unknown-ua").slice(0, 160);
  return `${forwardedFor.split(",")[0].trim()}|${userAgent}`;
}

async function enforceRateLimit(
  request: Request,
  scope: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<Response | null> {
  const db = await getD1();
  if (!db) return null;

  await ensureLicenseSchema(db);
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const resetAt = (bucket + 1) * windowSeconds;
  const nowIso = new Date().toISOString();
  const keyHash = await sha256Hex(`pikflyer-rate-v1:${scope}:${clientIdentity(request)}`);

  await db
    .prepare("DELETE FROM rate_limits WHERE reset_at < ?")
    .bind(now - windowSeconds)
    .run();
  await db
    .prepare(`INSERT OR IGNORE INTO rate_limits
      (key_hash, scope, bucket, count, reset_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)`)
    .bind(keyHash, scope, bucket, resetAt, nowIso)
    .run();

  const updateResult = await db
    .prepare(`UPDATE rate_limits
      SET count = count + 1, updated_at = ?
      WHERE key_hash = ? AND scope = ? AND bucket = ? AND count < ?`)
    .bind(nowIso, keyHash, scope, bucket, maxRequests)
    .run();
  const changed = Number((updateResult.meta as { changes?: number } | undefined)?.changes || 0);
  if (changed > 0) return null;

  const row = await db
    .prepare("SELECT count, reset_at FROM rate_limits WHERE key_hash = ? AND scope = ? AND bucket = ?")
    .bind(keyHash, scope, bucket)
    .first<RateLimitRow>();
  return jsonResponse(
    {
      success: false,
      valid: false,
      error: "too many requests",
      retry_after_seconds: Math.max(1, (row?.reset_at || resetAt) - now),
    },
    429,
  );
}

function trialPayload(row: TrialDeviceRow, now = new Date()): Record<string, unknown> {
  const expiresMs = Date.parse(row.trial_expires_at);
  const remainingMs = Math.max(0, expiresMs - now.getTime());
  const dayMs = 24 * 60 * 60 * 1000;
  const fullTrialExpired = expiresMs <= now.getTime();
  return {
    is_trial: true,
    start_at: row.trial_started_at,
    expire_at: row.trial_expires_at,
    remaining_days: remainingMs === 0 ? 0 : Math.ceil(remainingMs / dayMs),
    is_expired: fullTrialExpired,
    full_trial_active: !fullTrialExpired,
    phase: fullTrialExpired ? "limited_free" : "full_trial",
  };
}

function trialLimitFor(feature: string, trialInfo: Record<string, unknown>): number | null {
  const limits = trialInfo.is_expired ? POST_TRIAL_DAILY_LIMITS : TRIAL_DAILY_LIMITS;
  return Object.prototype.hasOwnProperty.call(limits, feature) ? limits[feature] : null;
}

function featureLabel(feature: string): string {
  return ({
    teleport: "傳送",
    dice: "骰子",
    citywalk: "城市散步",
    manual_batch: "手動批量匯入座標",
  } as Record<string, string>)[feature] || feature;
}

async function findInviteByCodeHash(db: D1Database, codeHash: string): Promise<InviteCodeRow | null> {
  return db
    .prepare("SELECT * FROM invite_codes WHERE code_hash = ?")
    .bind(codeHash)
    .first<InviteCodeRow>();
}

function inviteActiveResponse(row: InviteCodeRow): Response {
  return jsonResponse({
    success: true,
    valid: true,
    status: "active",
    provider: "invite",
    invite: true,
    expires_at: row.expires_at,
    instance_id: row.instance_id,
    instance: { id: row.instance_id },
    subscription: {
      status: "active",
      expires_at: row.expires_at,
      plan: "friend_invite_6_months",
    },
  });
}

async function tryInviteActivate(key: string, body: Record<string, unknown>): Promise<Response | null> {
  if (!looksLikeInviteCode(key)) return null;

  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, valid: false, error: "invite database is not configured" }, 500);
  }

  await ensureLicenseSchema(db);
  const codeHash = await inviteCodeHash(key);
  const deviceHash = await deviceHashFromBody(body);
  const now = new Date();
  let row = await findInviteByCodeHash(db, codeHash);
  if (!row) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼不存在或已失效" }, 404);
  }
  if (row.disabled_at) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼已停用" }, 403);
  }

  if (!row.bound_device_hash) {
    const instanceId = inviteInstanceId(codeHash, deviceHash);
    const activatedAt = now.toISOString();
    const expiresAt = addDaysIso(now, row.duration_days || 180);
    await db
      .prepare(`UPDATE invite_codes
        SET bound_device_hash = ?, instance_id = ?, activated_at = ?, expires_at = ?
        WHERE code_hash = ? AND bound_device_hash IS NULL AND disabled_at IS NULL`)
      .bind(deviceHash, instanceId, activatedAt, expiresAt, codeHash)
      .run();
    row = await findInviteByCodeHash(db, codeHash);
  }

  if (!row) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼啟用失敗，請重試" }, 409);
  }
  if (row.bound_device_hash !== deviceHash) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼已綁定另一台手機" }, 403);
  }
  if (isExpired(row.expires_at, now)) {
    return jsonResponse({ success: false, valid: false, status: "expired", error: "邀請碼半年免費期已到期" }, 403);
  }

  return inviteActiveResponse(row);
}

async function tryInviteValidate(key: string, body: Record<string, unknown>): Promise<Response | null> {
  if (!looksLikeInviteCode(key)) return null;

  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, valid: false, error: "invite database is not configured" }, 500);
  }

  await ensureLicenseSchema(db);
  const codeHash = await inviteCodeHash(key);
  const instanceId = requireString(body.instance_id, "instance_id");
  const deviceHash = await deviceHashFromBody(body);
  const row = await findInviteByCodeHash(db, codeHash);

  if (!row || !row.instance_id || !row.bound_device_hash) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼尚未啟用" }, 404);
  }
  if (row.instance_id !== instanceId || row.bound_device_hash !== deviceHash) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼不是綁定這台手機" }, 403);
  }
  if (row.disabled_at) {
    return jsonResponse({ success: false, valid: false, error: "邀請碼已停用" }, 403);
  }
  if (isExpired(row.expires_at)) {
    return jsonResponse({ success: false, valid: false, status: "expired", error: "邀請碼半年免費期已到期" }, 403);
  }

  await db
    .prepare("UPDATE invite_codes SET last_validated_at = ? WHERE code_hash = ?")
    .bind(new Date().toISOString(), codeHash)
    .run();
  return inviteActiveResponse(row);
}

async function tryInviteDeactivate(key: string, body: Record<string, unknown>): Promise<Response | null> {
  if (!looksLikeInviteCode(key)) return null;
  await tryInviteValidate(key, body);
  return jsonResponse({
    success: true,
    provider: "invite",
    message: "邀請碼仍保留原手機綁定；同一台手機可重新啟用。",
  });
}

function creemBase(relayEnv: RelayEnv): string {
  return relayEnv.CREEM_TEST_MODE === "true"
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1";
}

async function creemPost(path: string, payload: Record<string, string>): Promise<Response> {
  const relayEnv = await getRelayEnv();
  if (!relayEnv.CREEM_API_KEY) {
    return jsonResponse(
      { success: false, valid: false, error: "CREEM_API_KEY is not configured" },
      500,
    );
  }

  const response = await fetch(`${creemBase(relayEnv)}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-api-key": relayEnv.CREEM_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: Record<string, unknown>;
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  if (!response.ok) {
    return jsonResponse(
      { success: false, valid: false, error: `Creem HTTP ${response.status}`, detail: body },
      response.status,
    );
  }

  if (
    relayEnv.CREEM_PRODUCT_ID &&
    typeof body.product_id === "string" &&
    body.product_id !== relayEnv.CREEM_PRODUCT_ID
  ) {
    return jsonResponse(
      { success: false, valid: false, error: "license is for a different product" },
      403,
    );
  }

  return jsonResponse(body);
}

async function isPaidOrOwner(body: Record<string, unknown>): Promise<boolean> {
  const suppliedOwnerHash = typeof body.owner_device_hash === "string" ? body.owner_device_hash.trim() : "";
  if (suppliedOwnerHash && OWNER_DEVICE_HASHES.has(suppliedOwnerHash)) return true;

  const keyValue = body.key || body.license_key;
  const instanceValue = body.instance_id;
  if (typeof keyValue !== "string" || keyValue.trim() === "") return false;
  if (typeof instanceValue !== "string" || instanceValue.trim() === "") return false;

  const key = keyValue.trim();
  const instanceId = instanceValue.trim();
  if (looksLikeInviteCode(key)) {
    const response = await tryInviteValidate(key, body);
    if (!response || response.status >= 400) return false;
    const result = await response.json().catch(() => null) as { valid?: boolean } | null;
    return Boolean(result?.valid);
  }

  const db = await getD1();
  const credentialHash = await sha256Hex(`pikflyer-license-v1:${key}`);
  const now = new Date();
  if (db) {
    await ensureLicenseSchema(db);
    const cached = await db
      .prepare("SELECT valid_until FROM license_validation_cache WHERE credential_hash = ? AND instance_id = ?")
      .bind(credentialHash, instanceId)
      .first<LicenseCacheRow>();
    if (cached?.valid_until && Date.parse(cached.valid_until) > now.getTime()) return true;
  }

  const response = await creemPost("/licenses/validate", { key, instance_id: instanceId });
  if (response.status >= 400) return false;
  const result = await response.json().catch(() => null) as { valid?: boolean; status?: string } | null;
  const status = String(result?.status || "").toLowerCase();
  const valid = Boolean(result?.valid) || status === "active";
  if (valid && db) {
    const validUntil = addDaysIso(now, 1);
    await db
      .prepare(`INSERT OR REPLACE INTO license_validation_cache
        (credential_hash, instance_id, valid_until, updated_at)
        VALUES (?, ?, ?, ?)`)
      .bind(credentialHash, instanceId, validUntil, now.toISOString())
      .run();
  }
  return valid;
}

async function ensureActiveTrial(body: Record<string, unknown>): Promise<boolean> {
  const db = await getD1();
  if (!db) return false;
  await ensureLicenseSchema(db);
  const deviceHash = await deviceHashFromBody(body);
  const now = new Date();
  const nowIso = now.toISOString();
  let trial = await db
    .prepare("SELECT * FROM trial_devices WHERE device_hash = ?")
    .bind(deviceHash)
    .first<TrialDeviceRow>();

  if (!trial) {
    const expiresAt = addDaysIso(now, TRIAL_DAYS);
    await db
      .prepare(`INSERT INTO trial_devices
        (device_hash, trial_started_at, trial_expires_at, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(deviceHash, nowIso, expiresAt, nowIso, nowIso)
      .run();
    return true;
  }

  await db
    .prepare("UPDATE trial_devices SET last_seen_at = ? WHERE device_hash = ?")
    .bind(nowIso, deviceHash)
    .run();
  return true;
}

async function consumePoiUsageBudget(
  request: Request,
  body: Record<string, unknown>,
  requestedCount: number,
): Promise<Response> {
  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, allowed: false, error: "usage database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const count = Math.max(1, Math.min(Math.floor(requestedCount || 1), 8));
  const now = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();
  const deviceHash = await deviceHashFromBody(body);
  const ipHash = await sha256Hex(`pikflyer-poi-ip-v1:${clientIdentity(request)}`);
  const budgets = [
    {
      subject: deviceHash,
      scope: "paid_device_hour",
      bucket: new Date(now * 1000).toISOString().slice(0, 13),
      max: PAID_POI_HOURLY_LIMIT,
      resetAt: now + 60 * 60,
    },
    {
      subject: deviceHash,
      scope: "paid_device_day",
      bucket: taipeiDateKey(new Date(now * 1000)),
      max: PAID_POI_DAILY_LIMIT,
      resetAt: now + 24 * 60 * 60,
    },
    {
      subject: ipHash,
      scope: "paid_ip_15m",
      bucket: String(Math.floor(now / (15 * 60))),
      max: 480,
      resetAt: (Math.floor(now / (15 * 60)) + 1) * 15 * 60,
    },
  ];

  await db.prepare("DELETE FROM poi_return_usage WHERE reset_at < ?").bind(now - 3600).run();

  let grant = count;
  for (const budget of budgets) {
    await db
      .prepare(`INSERT OR IGNORE INTO poi_return_usage
        (subject_hash, scope, bucket, used, reset_at, updated_at)
        VALUES (?, ?, ?, 0, ?, ?)`)
      .bind(budget.subject, budget.scope, budget.bucket, budget.resetAt, nowIso)
      .run();
    const row = await db
      .prepare("SELECT used, reset_at FROM poi_return_usage WHERE subject_hash = ? AND scope = ? AND bucket = ?")
      .bind(budget.subject, budget.scope, budget.bucket)
      .first<PoiUsageRow>();
    grant = Math.min(grant, Math.max(0, budget.max - Number(row?.used || 0)));
  }

  if (grant < 1) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "poi_return_limit_reached",
      error: "今日地標資料讀取量已達安全上限，請稍後再試。",
      granted: 0,
    }, 429);
  }

  for (const budget of budgets) {
    const update = await db
      .prepare(`UPDATE poi_return_usage
        SET used = used + ?, updated_at = ?
        WHERE subject_hash = ? AND scope = ? AND bucket = ? AND used + ? <= ?`)
      .bind(grant, nowIso, budget.subject, budget.scope, budget.bucket, grant, budget.max)
      .run();
    const changed = Number((update.meta as { changes?: number } | undefined)?.changes || 0);
    if (changed < 1) {
      return jsonResponse({
        success: true,
        allowed: false,
        code: "poi_return_limit_reached",
        error: "地標資料讀取量已達安全上限，請稍後再試。",
        granted: 0,
      }, 429);
    }
  }

  return jsonResponse({
    success: true,
    allowed: true,
    paid: true,
    feature: "dice",
    granted: grant,
  });
}

async function consumeTrialQuota(
  body: Record<string, unknown>,
  feature: string,
  requestedCount: number,
  allowPartial: boolean,
): Promise<Response | null> {
  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, allowed: false, error: "trial database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const knownFeature = Object.prototype.hasOwnProperty.call(TRIAL_DAILY_LIMITS, feature)
    || Object.prototype.hasOwnProperty.call(POST_TRIAL_DAILY_LIMITS, feature);
  if (!knownFeature) {
    return jsonResponse({ success: false, allowed: false, error: `unknown trial feature: ${feature}` }, 400);
  }

  const count = Math.max(1, Math.min(Math.floor(requestedCount || 1), 10));
  const deviceHash = await deviceHashFromBody(body);
  const now = new Date();
  const nowIso = now.toISOString();
  const today = taipeiDateKey(now);
  let trial = await db
    .prepare("SELECT * FROM trial_devices WHERE device_hash = ?")
    .bind(deviceHash)
    .first<TrialDeviceRow>();

  if (!trial) {
    const expiresAt = addDaysIso(now, TRIAL_DAYS);
    await db
      .prepare(`INSERT INTO trial_devices
        (device_hash, trial_started_at, trial_expires_at, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(deviceHash, nowIso, expiresAt, nowIso, nowIso)
      .run();
    trial = {
      device_hash: deviceHash,
      trial_started_at: nowIso,
      trial_expires_at: expiresAt,
      created_at: nowIso,
      last_seen_at: nowIso,
    };
  } else {
    await db
      .prepare("UPDATE trial_devices SET last_seen_at = ? WHERE device_hash = ?")
      .bind(nowIso, deviceHash)
      .run();
  }

  await db
    .prepare(`INSERT OR IGNORE INTO trial_usage
      (device_hash, usage_date, feature, used, updated_at)
      VALUES (?, ?, ?, 0, ?)`)
    .bind(deviceHash, today, feature, nowIso)
    .run();

  const usageBefore = await db
    .prepare("SELECT used FROM trial_usage WHERE device_hash = ? AND usage_date = ? AND feature = ?")
    .bind(deviceHash, today, feature)
    .first<TrialUsageRow>();
  const usedBefore = Math.max(0, Number(usageBefore?.used || 0));
  const trialInfo = trialPayload(trial, now);
  const limit = trialLimitFor(feature, trialInfo) ?? 0;
  const remainingBefore = Math.max(0, limit - usedBefore);

  if (limit < 1) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "post_trial_feature_locked",
      error: `${featureLabel(feature)} 可在 7 天完整試用期內使用；試用後需訂閱 $4.99/月。`,
      feature,
      granted: 0,
      trial: trialInfo,
      trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedBefore }, remaining: { [feature]: 0 } },
    });
  }

  const grant = allowPartial ? Math.min(count, remainingBefore) : (remainingBefore >= count ? count : 0);
  if (grant < 1) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "daily_limit_reached",
      error: `今日 ${featureLabel(feature)} 次數已用完，訂閱 $4.99/月可解鎖更高額度。`,
      feature,
      granted: 0,
      trial: trialInfo,
      trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedBefore }, remaining: { [feature]: remainingBefore } },
    });
  }

  const updateResult = await db
    .prepare(`UPDATE trial_usage
      SET used = used + ?, updated_at = ?
      WHERE device_hash = ? AND usage_date = ? AND feature = ? AND used + ? <= ?`)
    .bind(grant, nowIso, deviceHash, today, feature, grant, limit)
    .run();
  const changed = Number((updateResult.meta as { changes?: number } | undefined)?.changes || 0);
  if (changed < 1) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "daily_limit_reached",
      error: `今日 ${featureLabel(feature)} 次數已用完，訂閱 $4.99/月可解鎖更高額度。`,
      feature,
      granted: 0,
      trial: trialInfo,
      trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedBefore }, remaining: { [feature]: remainingBefore } },
    });
  }

  const usedAfter = usedBefore + grant;
  return jsonResponse({
    success: true,
    allowed: true,
    paid: false,
    feature,
    granted: grant,
    trial: trialInfo,
    trial_usage: {
      date: today,
      limits: { [feature]: limit },
      counts: { [feature]: usedAfter },
      remaining: { [feature]: Math.max(0, limit - usedAfter) },
    },
  });
}

export async function authorizeFeatureUse(
  request: Request,
  body: Record<string, unknown>,
  feature: string,
  requestedCount: number,
  allowPartial = false,
): Promise<Response> {
  const updateBlocked = enforceAndroidUpdate(body);
  if (updateBlocked) return updateBlocked;

  const limited = await enforceRateLimit(request, `feature_${feature}`, 240, 15 * 60);
  if (limited) return limited;

  const count = Math.max(1, Math.min(Math.floor(requestedCount || 1), 10));
  if (await isPaidOrOwner(body)) {
    return jsonResponse({
      success: true,
      allowed: true,
      paid: true,
      feature,
      granted: count,
    });
  }

  return consumeTrialQuota(body, feature, count, allowPartial);
}

export async function authorizePoiRoll(
  request: Request,
  body: Record<string, unknown>,
  requestedCount: number,
): Promise<Response> {
  const updateBlocked = enforceAndroidUpdate(body);
  if (updateBlocked) return updateBlocked;

  const limited = await enforceRateLimit(request, "poi_roll", 60, 15 * 60);
  if (limited) return limited;

  const count = Math.max(1, Math.min(Math.floor(requestedCount || 1), 8));
  if (await isPaidOrOwner(body)) {
    return consumePoiUsageBudget(request, body, count);
  }
  const quota = await consumeTrialQuota(body, "dice", 1, false);
  const quotaBody = await quota.clone().json().catch(() => null) as { allowed?: boolean; paid?: boolean } | null;
  if (!quotaBody?.allowed) return quota;
  return jsonResponse({
    ...quotaBody,
    granted: count,
  });
}

export async function authorizePoiPrefetch(
  request: Request,
  body: Record<string, unknown>,
  requestedCount: number,
): Promise<Response> {
  const updateBlocked = enforceAndroidUpdate(body);
  if (updateBlocked) return updateBlocked;

  const limited = await enforceRateLimit(request, "poi_prefetch", 120, 15 * 60);
  if (limited) return limited;

  const count = Math.max(1, Math.min(Math.floor(requestedCount || 1), 8));
  if (await isPaidOrOwner(body)) {
    return jsonResponse({
      success: true,
      allowed: true,
      paid: true,
      feature: "dice",
      granted: count,
    });
  }
  const active = await ensureActiveTrial(body);
  if (!active) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "trial_expired",
      error: "免費試用已到期，請訂閱 $4.99/月解鎖全部功能。",
      granted: 0,
    }, 403);
  }
  return jsonResponse({
    success: true,
    allowed: true,
    paid: false,
    feature: "dice",
    granted: count,
  });
}

export async function authorizeStarterPack(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "poi_starter", 10, 15 * 60);
  if (limited) return limited;
  const body = await readJson(request);
  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, allowed: false, error: "starter database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);
  const deviceHash = await deviceHashFromBody(body);
  const nowIso = new Date().toISOString();
  let row = await db
    .prepare("SELECT * FROM starter_packs WHERE device_hash = ?")
    .bind(deviceHash)
    .first<StarterPackRow>();
  let alreadyClaimed = Boolean(row);

  if (!row) {
    const eligible = await isPaidOrOwner(body) || await ensureActiveTrial(body);
    if (!eligible) {
      return jsonResponse({
        success: true,
        allowed: false,
        code: "starter_not_allowed",
        error: "免費試用已到期，請訂閱後重新取得備用地標包。",
      }, 403);
    }
    const seed = crypto.randomUUID();
    const packId = `starter_${(await sha256Hex(`${deviceHash}:${seed}`)).slice(0, 20)}`;
    await db
      .prepare(`INSERT OR IGNORE INTO starter_packs
        (device_hash, pack_id, seed, count, created_at, last_returned_at)
        VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(deviceHash, packId, seed, STARTER_PACK_SIZE, nowIso, nowIso)
      .run();
    row = await db
      .prepare("SELECT * FROM starter_packs WHERE device_hash = ?")
      .bind(deviceHash)
      .first<StarterPackRow>();
    alreadyClaimed = false;
  } else {
    await db
      .prepare("UPDATE starter_packs SET last_returned_at = ? WHERE device_hash = ?")
      .bind(nowIso, deviceHash)
      .run();
    alreadyClaimed = true;
  }

  if (!row) {
    return jsonResponse({ success: false, allowed: false, error: "starter pack unavailable" }, 500);
  }
  return jsonResponse({
    success: true,
    allowed: true,
    pack_id: row.pack_id,
    seed: row.seed,
    count: row.count,
    already_claimed: alreadyClaimed,
  });
}

export async function issueQuota(request: Request): Promise<Response> {
  const body = await readJson(request);
  const feature = requireString(body.feature, "feature", 32);
  const count = Math.max(1, Math.min(Number(body.count || 1), 10));
  return authorizeFeatureUse(request, body, feature, count, true);
}

export async function health(request?: Request): Promise<Response> {
  const relayEnv = await getRelayEnv();
  const suppliedToken = request?.headers.get("x-admin-token") || "";
  if (!relayEnv.INVITE_ADMIN_TOKEN || suppliedToken !== relayEnv.INVITE_ADMIN_TOKEN) {
    return jsonResponse({ ok: true });
  }
  return jsonResponse({
    ok: true,
    creem_test_mode: relayEnv.CREEM_TEST_MODE === "true",
    creem_configured: Boolean(relayEnv.CREEM_API_KEY),
    invite_db_configured: Boolean(relayEnv.DB),
    invite_admin_configured: Boolean(relayEnv.INVITE_ADMIN_TOKEN),
    server_trial_configured: Boolean(relayEnv.DB),
    trial_days: TRIAL_DAYS,
    trial_daily_limits: TRIAL_DAILY_LIMITS,
    post_trial_daily_limits: POST_TRIAL_DAILY_LIMITS,
    android_update: androidUpdatePayload({ platform: "android", app_version: LATEST_ANDROID_VERSION }),
  });
}

export async function activate(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "activate", 30, 15 * 60);
  if (limited) return limited;
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceName = requireString(body.instance_name || body.device_id, "instance name");
  const invite = await tryInviteActivate(key, body);
  if (invite) return invite;
  return creemPost("/licenses/activate", { key, instance_name: instanceName });
}

export async function validate(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "validate", 120, 15 * 60);
  if (limited) return limited;
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceId = requireString(body.instance_id, "instance_id");
  const invite = await tryInviteValidate(key, body);
  if (invite) return invite;
  return creemPost("/licenses/validate", { key, instance_id: instanceId });
}

export async function deactivate(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "deactivate", 30, 15 * 60);
  if (limited) return limited;
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceId = requireString(body.instance_id, "instance_id");
  const invite = await tryInviteDeactivate(key, body);
  if (invite) return invite;
  return creemPost("/licenses/deactivate", { key, instance_id: instanceId });
}

function randomInviteCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = [...bytes].map((byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]);
  return `${INVITE_CODE_PREFIX}-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

function requireInviteAdmin(request: Request, relayEnv: RelayEnv): void {
  const configuredToken = relayEnv.INVITE_ADMIN_TOKEN;
  const suppliedToken = request.headers.get("x-admin-token") || "";
  if (!configuredToken || suppliedToken !== configuredToken) {
    throw new Error("invite admin token is invalid");
  }
}

export async function createInviteCodes(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "invite_admin", 10, 15 * 60);
  if (limited) return limited;
  const relayEnv = await getRelayEnv();
  requireInviteAdmin(request, relayEnv);
  const db = relayEnv.DB;
  if (!db) {
    return jsonResponse({ success: false, error: "invite database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const body = await readJson(request);
  const count = Math.max(1, Math.min(Number(body.count || 1), 50));
  const durationDays = Math.max(1, Math.min(Number(body.duration_days || 180), 366));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) : "friends";
  const createdAt = new Date().toISOString();
  const codes: string[] = [];

  while (codes.length < count) {
    const code = randomInviteCode();
    const codeHash = await inviteCodeHash(code);
    const id = crypto.randomUUID();
    try {
      await db
        .prepare(`INSERT INTO invite_codes
          (id, code_hash, label, duration_days, max_devices, created_at)
          VALUES (?, ?, ?, ?, 1, ?)`)
        .bind(id, codeHash, label, durationDays, createdAt)
        .run();
      codes.push(code);
    } catch {
      // Retry on the extremely unlikely random-code collision.
    }
  }

  return jsonResponse({
    success: true,
    duration_days: durationDays,
    max_devices: 1,
    codes,
  });
}

export async function listInviteCodes(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "invite_admin", 20, 15 * 60);
  if (limited) return limited;
  const relayEnv = await getRelayEnv();
  requireInviteAdmin(request, relayEnv);
  const db = relayEnv.DB;
  if (!db) {
    return jsonResponse({ success: false, error: "invite database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const result = await db
    .prepare(`SELECT id, label, duration_days, max_devices,
      bound_device_hash IS NOT NULL AS activated,
      activated_at, expires_at, disabled_at, created_at, last_validated_at
      FROM invite_codes
      ORDER BY created_at DESC
      LIMIT 100`)
    .all();

  return jsonResponse({ success: true, codes: result.results || [] });
}

export async function checkTrial(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "trial", 120, 15 * 60);
  if (limited) return limited;
  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, allowed: false, error: "trial database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const body = await readJson(request);
  const feature = requireString(body.feature, "feature", 32);
  const knownFeature = Object.prototype.hasOwnProperty.call(TRIAL_DAILY_LIMITS, feature)
    || Object.prototype.hasOwnProperty.call(POST_TRIAL_DAILY_LIMITS, feature);
  if (!knownFeature) {
    return jsonResponse({ success: false, allowed: false, error: `unknown trial feature: ${feature}` }, 400);
  }

  const consume = body.consume !== false;
  const deviceHash = await deviceHashFromBody(body);
  const now = new Date();
  const nowIso = now.toISOString();
  const today = taipeiDateKey(now);
  let trial = await db
    .prepare("SELECT * FROM trial_devices WHERE device_hash = ?")
    .bind(deviceHash)
    .first<TrialDeviceRow>();

  const shouldStartTrial = body.start_trial === true;
  if (!trial && !shouldStartTrial) {
    return jsonResponse({
      success: true,
      allowed: true,
      paid: false,
      code: "trial_not_started",
      trial: {
        is_trial: true,
        is_expired: false,
        full_trial_active: false,
        phase: "not_started",
        remaining_days: TRIAL_DAYS,
        starts_on_first_use: true,
      },
      trial_days: TRIAL_DAYS,
      trial_daily_limits: TRIAL_DAILY_LIMITS,
      post_trial_daily_limits: POST_TRIAL_DAILY_LIMITS,
      trial_usage: {
        date: taipeiDateKey(now),
        limits: TRIAL_DAILY_LIMITS,
        counts: {},
        remaining: TRIAL_DAILY_LIMITS,
      },
    });
  }

  if (!trial) {
    const expiresAt = addDaysIso(now, TRIAL_DAYS);
    await db
      .prepare(`INSERT INTO trial_devices
        (device_hash, trial_started_at, trial_expires_at, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(deviceHash, nowIso, expiresAt, nowIso, nowIso)
      .run();
    trial = {
      device_hash: deviceHash,
      trial_started_at: nowIso,
      trial_expires_at: expiresAt,
      created_at: nowIso,
      last_seen_at: nowIso,
    };
  } else {
    await db
      .prepare("UPDATE trial_devices SET last_seen_at = ? WHERE device_hash = ?")
      .bind(nowIso, deviceHash)
      .run();
  }

  await db
    .prepare(`INSERT OR IGNORE INTO trial_usage
      (device_hash, usage_date, feature, used, updated_at)
      VALUES (?, ?, ?, 0, ?)`)
    .bind(deviceHash, today, feature, nowIso)
    .run();

  const usageBefore = await db
    .prepare("SELECT used FROM trial_usage WHERE device_hash = ? AND usage_date = ? AND feature = ?")
    .bind(deviceHash, today, feature)
    .first<TrialUsageRow>();
  const usedBefore = Math.max(0, Number(usageBefore?.used || 0));
  const trialInfo = trialPayload(trial, now);
  const limit = trialLimitFor(feature, trialInfo) ?? 0;

  if (limit < 1) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "post_trial_feature_locked",
      error: `${featureLabel(feature)} 可在 7 天完整試用期內使用；試用後需訂閱 $4.99/月。`,
      feature,
      trial: trialInfo,
      trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedBefore }, remaining: { [feature]: 0 } },
    });
  }

  if (usedBefore >= limit) {
    return jsonResponse({
      success: true,
      allowed: false,
      code: "daily_limit_reached",
      error: `今日 ${featureLabel(feature)} 次數已用完，訂閱 $4.99/月可解鎖更高額度。`,
      feature,
      trial: trialInfo,
      trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedBefore }, remaining: { [feature]: 0 } },
    });
  }

  let usedAfter = usedBefore;
  if (consume) {
    const updateResult = await db
      .prepare(`UPDATE trial_usage
        SET used = used + 1, updated_at = ?
        WHERE device_hash = ? AND usage_date = ? AND feature = ? AND used < ?`)
      .bind(nowIso, deviceHash, today, feature, limit)
      .run();
    const changed = Number((updateResult.meta as { changes?: number } | undefined)?.changes || 0);
    const usageAfter = await db
      .prepare("SELECT used FROM trial_usage WHERE device_hash = ? AND usage_date = ? AND feature = ?")
      .bind(deviceHash, today, feature)
      .first<TrialUsageRow>();
    usedAfter = Math.max(0, Number(usageAfter?.used || 0));
    if (changed < 1) {
      return jsonResponse({
        success: true,
        allowed: false,
        code: "daily_limit_reached",
        error: `今日 ${featureLabel(feature)} 次數已用完，訂閱 $4.99/月可解鎖更高額度。`,
        feature,
        trial: trialInfo,
        trial_usage: { date: today, limits: { [feature]: limit }, counts: { [feature]: usedAfter }, remaining: { [feature]: 0 } },
      });
    }
  }

  const allowed = usedAfter <= limit;
  return jsonResponse({
    success: true,
    allowed,
    paid: false,
    feature,
    trial: trialInfo,
    trial_usage: {
      date: today,
      limits: { [feature]: limit },
      counts: { [feature]: usedAfter },
      remaining: { [feature]: Math.max(0, limit - usedAfter) },
    },
  });
}

export async function trialStatus(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "trial_status", 120, 15 * 60);
  if (limited) return limited;
  const db = await getD1();
  if (!db) {
    return jsonResponse({ success: false, allowed: false, error: "trial database is not configured" }, 500);
  }
  await ensureLicenseSchema(db);

  const body = await readJson(request);
  if (await isPaidOrOwner(body)) {
    return jsonResponse({
      success: true,
      allowed: true,
      paid: true,
      trial: null,
    });
  }

  const deviceHash = await deviceHashFromBody(body);
  const now = new Date();
  const nowIso = now.toISOString();
  let trial = await db
    .prepare("SELECT * FROM trial_devices WHERE device_hash = ?")
    .bind(deviceHash)
    .first<TrialDeviceRow>();

  if (!trial) {
    const expiresAt = addDaysIso(now, TRIAL_DAYS);
    await db
      .prepare(`INSERT INTO trial_devices
        (device_hash, trial_started_at, trial_expires_at, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(deviceHash, nowIso, expiresAt, nowIso, nowIso)
      .run();
    trial = {
      device_hash: deviceHash,
      trial_started_at: nowIso,
      trial_expires_at: expiresAt,
      created_at: nowIso,
      last_seen_at: nowIso,
    };
  } else {
    await db
      .prepare("UPDATE trial_devices SET last_seen_at = ? WHERE device_hash = ?")
      .bind(nowIso, deviceHash)
      .run();
  }

  const payload = trialPayload(trial, now);
  return jsonResponse({
    success: true,
    allowed: !payload.is_expired,
    paid: false,
    code: payload.is_expired ? "trial_expired" : "trial_active",
    trial: payload,
    trial_days: TRIAL_DAYS,
    trial_daily_limits: TRIAL_DAILY_LIMITS,
    post_trial_daily_limits: POST_TRIAL_DAILY_LIMITS,
  }, payload.is_expired ? 403 : 200);
}

export async function appUpdateStatus(request: Request): Promise<Response> {
  const limited = await enforceRateLimit(request, "app_update", 120, 15 * 60);
  if (limited) return limited;
  const body = await readJson(request);
  return jsonResponse(androidUpdatePayload(body));
}

export function methodNotAllowed(): Response {
  return jsonResponse({ success: false, valid: false, error: "method not allowed" }, 405);
}

export function relayError(error: unknown): Response {
  console.warn("license relay request failed", error);
  return jsonResponse(
    {
      success: false,
      valid: false,
      error: "request failed",
    },
    400,
  );
}
