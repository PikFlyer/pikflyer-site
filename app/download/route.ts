import { jsonResponse, methodNotAllowed, relayError } from "../licenseRelay";
import { recordSiteStat } from "../statsStore";

const DOWNLOAD_FILES = new Set([
  "pikflyer-xiaochibang-android-v2.0.12.apk",
  "pikflyer-xiaochibang-android-v2.0.10.apk",
  "pikflyer-xiaochibang-android-v2.0.8.apk",
  "pikflyer-xiaochibang-android-v2.0.7.apk",
]);
const DEFAULT_DOWNLOAD_FILE = "pikflyer-xiaochibang-android-v2.0.12.apk";

function getDownloadFile(request: Request): Response | string {
  const url = new URL(request.url);
  const file = url.searchParams.get("file") || DEFAULT_DOWNLOAD_FILE;
  if (!DOWNLOAD_FILES.has(file)) {
    return jsonResponse({ success: false, error: "download file not found" }, 404);
  }
  return file;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const file = getDownloadFile(request);
    if (file instanceof Response) return file;

    const location = new URL(`/downloads/${file}`, request.url).toString();
    await recordSiteStat(request, "download", file);
    return Response.redirect(location, 302);
  } catch (error) {
    return relayError(error);
  }
}

export async function HEAD(request: Request): Promise<Response> {
  const file = getDownloadFile(request);
  if (file instanceof Response) return new Response(null, { status: file.status, headers: file.headers });
  const location = new URL(`/downloads/${file}`, request.url).toString();
  return new Response(null, { status: 302, headers: { location } });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
