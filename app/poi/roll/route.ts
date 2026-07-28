import {
  authorizePoiRoll,
  jsonResponse,
  methodNotAllowed,
  readJson,
  relayError,
} from "../../licenseRelay";
import { rollServerPois } from "../../serverPoi";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJson(request);
    const requestedCount = Math.max(1, Math.min(Number(body.count || 8), 8));
    const auth = await authorizePoiRoll(request, body, requestedCount);
    const authBody = await auth.clone().json().catch(() => null) as { allowed?: boolean; granted?: number; paid?: boolean } | null;
    if (!authBody?.allowed) return auth;

    const granted = Math.max(1, Math.min(Number(authBody.granted || 1), requestedCount));
    const rolled = rollServerPois(body, granted);
    if (rolled.results.length < 1) {
      return jsonResponse({
        success: false,
        allowed: true,
        error: "沒有符合條件的 POI",
        group: rolled.group,
      }, 404);
    }

    return jsonResponse({
      success: true,
      allowed: true,
      paid: Boolean(authBody.paid),
      group: rolled.group,
      count: rolled.results.length,
      results: rolled.results,
      poi: rolled.results[0],
    });
  } catch (error) {
    return relayError(error);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
