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

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizePoi(row: PoiRecord, group: string): Record<string, unknown> | null {
  const lat = numberOrNaN(row.lat);
  const lng = numberOrNaN(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const pTag = typeof row.tag === "string" ? row.tag : "";
  return {
    name: row.name || "未命名地點",
    city: row.city || "",
    lat,
    lng,
    tag: pTag,
    tagName: tagName(group, pTag),
    tz: typeof row.tz === "number" ? row.tz : 0,
    group,
  };
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
    const normalized = normalizePoi(row, group);
    if (normalized) results.push(normalized);
  }

  return { results, group };
}

export function starterServerPois(seed: string, count: number): Record<string, unknown>[] {
  const rng = seededRandom(seed);
  const pools = [
    { group: "postcard", rows: groups.postcard, weight: 70 },
    { group: "decor", rows: groups.decor, weight: 30 },
  ];
  const picked = new Set<string>();
  const results: Record<string, unknown>[] = [];
  const safeCount = Math.max(1, Math.min(Math.floor(count || 100), 100));

  for (let attempts = 0; attempts < safeCount * 30 && results.length < safeCount; attempts += 1) {
    const roll = rng() * 100;
    const pool = roll < pools[0].weight ? pools[0] : pools[1];
    const idx = Math.floor(rng() * pool.rows.length);
    const key = `${pool.group}:${idx}`;
    if (picked.has(key)) continue;
    const normalized = normalizePoi(pool.rows[idx], pool.group);
    if (!normalized) continue;
    picked.add(key);
    results.push(normalized);
  }

  return results;
}
