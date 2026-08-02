import eventsData from "../../../public/data/events.json";
import { jsonResponse } from "../../licenseRelay";

const HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
};

type Params = {
  params: Promise<{ file: string }> | { file: string };
};

async function resolveFile(params: Params["params"]): Promise<string> {
  return (await params).file;
}

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const file = await resolveFile(params);
  if (file !== "events.json") {
    return jsonResponse({ success: false, error: "data file not found" }, 404);
  }
  return Response.json(eventsData, { headers: HEADERS });
}

export async function HEAD(_request: Request, { params }: Params): Promise<Response> {
  const file = await resolveFile(params);
  if (file !== "events.json") {
    return new Response(null, { status: 404, headers: HEADERS });
  }
  return new Response(null, { status: 200, headers: HEADERS });
}
