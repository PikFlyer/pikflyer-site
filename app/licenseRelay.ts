const JSON_HEADERS = {
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

const INVITE_CODE_PREFIX = "PF";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let inviteSchemaReady: Promise<void> | null = null;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
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

async function ensureInviteSchema(db: D1Database): Promise<void> {
  inviteSchemaReady ||= db
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
    ])
    .then(() => undefined);
  return inviteSchemaReady;
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

  await ensureInviteSchema(db);
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

  await ensureInviteSchema(db);
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

export async function health(): Promise<Response> {
  const relayEnv = await getRelayEnv();
  return jsonResponse({
    ok: true,
    creem_test_mode: relayEnv.CREEM_TEST_MODE === "true",
    creem_configured: Boolean(relayEnv.CREEM_API_KEY),
    invite_db_configured: Boolean(relayEnv.DB),
    invite_admin_configured: Boolean(relayEnv.INVITE_ADMIN_TOKEN),
  });
}

export async function activate(request: Request): Promise<Response> {
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceName = requireString(body.instance_name || body.device_id, "instance name");
  const invite = await tryInviteActivate(key, body);
  if (invite) return invite;
  return creemPost("/licenses/activate", { key, instance_name: instanceName });
}

export async function validate(request: Request): Promise<Response> {
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceId = requireString(body.instance_id, "instance_id");
  const invite = await tryInviteValidate(key, body);
  if (invite) return invite;
  return creemPost("/licenses/validate", { key, instance_id: instanceId });
}

export async function deactivate(request: Request): Promise<Response> {
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
  const relayEnv = await getRelayEnv();
  requireInviteAdmin(request, relayEnv);
  const db = relayEnv.DB;
  if (!db) {
    return jsonResponse({ success: false, error: "invite database is not configured" }, 500);
  }
  await ensureInviteSchema(db);

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
  const relayEnv = await getRelayEnv();
  requireInviteAdmin(request, relayEnv);
  const db = relayEnv.DB;
  if (!db) {
    return jsonResponse({ success: false, error: "invite database is not configured" }, 500);
  }
  await ensureInviteSchema(db);

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

export function methodNotAllowed(): Response {
  return jsonResponse({ success: false, valid: false, error: "method not allowed" }, 405);
}

export function relayError(error: unknown): Response {
  return jsonResponse(
    {
      success: false,
      valid: false,
      error: error instanceof Error ? error.message : "request failed",
    },
    400,
  );
}
