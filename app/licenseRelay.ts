const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

type RelayEnv = {
  CREEM_API_KEY?: string;
  CREEM_TEST_MODE?: string;
  CREEM_PRODUCT_ID?: string;
};

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
    };
  }
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
  });
}

export async function activate(request: Request): Promise<Response> {
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceName = requireString(body.instance_name || body.device_id, "instance name");
  return creemPost("/licenses/activate", { key, instance_name: instanceName });
}

export async function validate(request: Request): Promise<Response> {
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceId = requireString(body.instance_id, "instance_id");
  return creemPost("/licenses/validate", { key, instance_id: instanceId });
}

export async function deactivate(request: Request): Promise<Response> {
  const body = await readJson(request);
  const key = requireString(body.key || body.license_key, "license key");
  const instanceId = requireString(body.instance_id, "instance_id");
  return creemPost("/licenses/deactivate", { key, instance_id: instanceId });
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
