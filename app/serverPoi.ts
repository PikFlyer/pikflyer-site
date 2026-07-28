import decorPois from "../server-data/decor_pois.json";
import poiTags from "../server-data/poi_tags.json";
import postcardPois from "../server-data/pois.json";

type PoiRecord = {
  name?: string;
  city?: string;
  lat?: number;
  lng?: number;
  tz?: number;
  tag?: string;
};

type RollParams = {
  group?: unknown;
  tag?: unknown;
  tz?: unknown;
  lat?: unknown;
  lng?: unknown;
};

const MAX_DISTANCE_FROM_CURRENT_M = 300;

const groups: Record<string, PoiRecord[]> = {
  postcard: postcardPois as PoiRecord[],
  decor: decorPois as PoiRecord[],
};

const tagIndex = new Map<string, PoiRecord[]>();

function groupTagKey(group: string, tag: string): string {
  return `${group}:${tag}`;
}

function buildIndex(): void {
  if (tagIndex.size > 0) return;
  for (const [group, rows] of Object.entries(groups)) {
    tagIndex.set(groupTagKey(group, ""), rows);
    for (const row of rows) {
      const tag = typeof row.tag === "string" ? row.tag : "";
      if (!tag) continue;
      const key = groupTagKey(group, tag);
      const bucket = tagIndex.get(key) || [];
      bucket.push(row);
      tagIndex.set(key, bucket);
    }
  }
}

function numberOrNaN(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.NaN;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function tagName(group: string, tag: string): string {
  const groupObj = (poiTags as Record<string, { tags?: Record<string, string> }>)[group];
  return groupObj?.tags?.[tag] || tag;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollServerPois(params: RollParams, count: number): { results: Record<string, unknown>[]; group: string } {
  buildIndex();
  const group = params.group === "decor" ? "decor" : "postcard";
  const tag = typeof params.tag === "string" && params.tag.trim() ? params.tag.trim() : "";
  const userTz = numberOrNaN(params.tz);
  const curLat = numberOrNaN(params.lat);
  const curLng = numberOrNaN(params.lng);
  const pool = tagIndex.get(groupTagKey(group, tag)) || [];
  const picked = new Set<number>();
  const results: Record<string, unknown>[] = [];
  const attemptsMax = Math.max(200, Math.min(pool.length, count * 80));

  for (let attempts = 0; attempts < attemptsMax && results.length < count; attempts += 1) {
    if (pool.length < 1) break;
    const idx = Math.floor(Math.random() * pool.length);
    if (picked.has(idx)) continue;
    const row = pool[idx];
    const lat = numberOrNaN(row.lat);
    const lng = numberOrNaN(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Number.isFinite(userTz) && Math.abs((row.tz || 0) - userTz) > 15) continue;
    if (Number.isFinite(curLat) && Number.isFinite(curLng)) {
      if (haversineMeters(curLat, curLng, lat, lng) < MAX_DISTANCE_FROM_CURRENT_M) continue;
    }
    picked.add(idx);
    const pTag = typeof row.tag === "string" ? row.tag : "";
    results.push({
      name: row.name || "未命名地點",
      city: row.city || "",
      lat,
      lng,
      tag: pTag,
      tagName: tagName(group, pTag),
      tz: typeof row.tz === "number" ? row.tz : 0,
    });
  }

  return { results, group };
}
