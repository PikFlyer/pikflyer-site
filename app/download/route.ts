import { jsonResponse, methodNotAllowed, relayError } from "../licenseRelay";
import { recordSiteStat } from "../statsStore";

const DOWNLOAD_FILES = new Set([
  "pikflyer-xiaochibang-android-v1.0.13.apk",
]);

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const file = url.searchParams.get("file") || "pikflyer-xiaochibang-android-v1.0.13.apk";
    if (!DOWNLOAD_FILES.has(file)) {
      return jsonResponse({ success: false, error: "download file not found" }, 404);
    }

    await recordSiteStat(request, "download", file);
    return Response.redirect(new URL(`/downloads/${file}`, url.origin).toString(), 302);
  } catch (error) {
    return relayError(error);
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
