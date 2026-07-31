import { authorizeStatsReport, getStatsReport } from "../../statsStore";
import { jsonResponse, methodNotAllowed, relayError } from "../../licenseRelay";

export async function GET(request: Request): Promise<Response> {
  try {
    if (!(await authorizeStatsReport(request))) {
      return jsonResponse({ success: false, error: "unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") || "14");
    const report = await getStatsReport(days);
    return jsonResponse({
      success: true,
      ...report,
      subscriptions: {
        source: "Creem",
        status: "manual_check_required",
      },
    });
  } catch (error) {
    return relayError(error);
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
