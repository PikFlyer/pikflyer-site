import { jsonResponse, methodNotAllowed, relayError } from "../licenseRelay";
import { recordSiteStat } from "../statsStore";

const DOWNLOAD_FILES = new Set([
  "pikflyer-xiaochibang-android-v2.0.1.apk",
]);

function getDownloadLocation(request: Request): Response | string {
  const url = new URL(request.url);
  const file = url.searchParams.get("file") || "pikflyer-xiaochibang-android-v2.0.1.apk";
  if (!DOWNLOAD_FILES.has(file)) {
    return jsonResponse({ success: false, error: "download file not found" }, 404);
  }
  return new URL(`/downloads/${file}`, url.origin).toString();
}

export async function GET(request: Request): Promise<Response> {
  try {
    const location = getDownloadLocation(request);
    if (location instanceof Response) return location;

    await recordSiteStat(request, "download", "pikflyer-xiaochibang-android-v2.0.1.apk");
    return Response.redirect(location, 302);
  } catch (error) {
    return relayError(error);
  }
}

export async function HEAD(request: Request): Promise<Response> {
  const location = getDownloadLocation(request);
  if (location instanceof Response) return new Response(null, { status: location.status, headers: location.headers });
  return new Response(null, { status: 302, headers: { location } });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
