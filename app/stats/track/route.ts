import { jsonResponse, methodNotAllowed, relayError } from "../../licenseRelay";
import { recordSiteStat } from "../../statsStore";

export async function POST(request: Request): Promise<Response> {
  try {
    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 2048) {
      return jsonResponse({ success: false, error: "request body is too large" }, 413);
    }

    const body = (await request.json().catch((error: unknown) => {
      throw new Error(`invalid stats payload: ${error instanceof Error ? error.message : String(error)}`);
    })) as { event?: unknown; path?: unknown };

    if (body.event !== "page_view") {
      return jsonResponse({ success: false, error: "unsupported stats event" }, 400);
    }

    const path = typeof body.path === "string" && body.path.trim() ? body.path : "/";
    const result = await recordSiteStat(request, "page_view", path);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    return relayError(error);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
