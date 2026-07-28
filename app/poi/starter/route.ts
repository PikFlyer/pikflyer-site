import {
  authorizeStarterPack,
  jsonResponse,
  methodNotAllowed,
  relayError,
} from "../../licenseRelay";
import { starterServerPois } from "../../serverPoi";

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await authorizeStarterPack(request);
    const authBody = await auth.clone().json().catch(() => null) as {
      allowed?: boolean;
      pack_id?: string;
      seed?: string;
      count?: number;
      already_claimed?: boolean;
    } | null;
    if (!authBody?.allowed || !authBody.seed || !authBody.pack_id) return auth;

    const count = Math.max(1, Math.min(Number(authBody.count || 100), 100));
    const results = starterServerPois(authBody.seed, count).map((poi) => ({
      ...poi,
      starter_pack_id: authBody.pack_id,
    }));
    return jsonResponse({
      success: true,
      allowed: true,
      pack_id: authBody.pack_id,
      already_claimed: Boolean(authBody.already_claimed),
      count: results.length,
      results,
    });
  } catch (error) {
    return relayError(error);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
