import eventsData from "../../../public/data/events.json";

const HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
  "content-type": "application/json; charset=utf-8",
};

export async function GET(): Promise<Response> {
  return Response.json(eventsData, { headers: HEADERS });
}

export async function HEAD(): Promise<Response> {
  return new Response(null, { status: 200, headers: HEADERS });
}
