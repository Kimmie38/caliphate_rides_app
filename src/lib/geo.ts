export type LatLng = { latitude: number; longitude: number };

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;

/** Straight-line distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Compass bearing from a to b in degrees (0 = north). */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.longitude - a.longitude)) * Math.cos(rad(b.latitude));
  const x =
    Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) -
    Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(rad(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
}

export function pathLengthKm(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i]);
  return total;
}

/** Point `km` along a path, with the heading of the segment it lies on. */
export function pointAlong(path: LatLng[], km: number): { point: LatLng; heading: number; index: number } {
  if (path.length === 1) return { point: path[0], heading: 0, index: 0 };
  let remaining = Math.max(0, km);
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (remaining <= seg || i === path.length - 1) {
      const t = seg === 0 ? 1 : Math.min(1, remaining / seg);
      return { point: lerp(path[i - 1], path[i], t), heading: bearing(path[i - 1], path[i]), index: i };
    }
    remaining -= seg;
  }
  const last = path[path.length - 1];
  return { point: last, heading: 0, index: path.length - 1 };
}

/** The part of the path still ahead of `km`. */
export function remainingPath(path: LatLng[], km: number): LatLng[] {
  const { point, index } = pointAlong(path, km);
  return [point, ...path.slice(index)];
}

/** Where a point sits on a path: the nearest point on the line, which segment it's on, and how far off the line it is. */
export type PathSnap = {
  point: LatLng; // nearest point on the path
  index: number; // the path vertex that comes next after `point`
  offsetKm: number; // distance from the original point to the path
  heading: number; // compass direction of the road at that point
};

/**
 * Snaps a point onto a path (e.g. a GPS fix onto the road route). Works on segments, not just vertices.
 * `fromIndex` skips segments already driven, so a route that passes near itself doesn't make the car jump ahead.
 */
export function snapToPath(path: LatLng[], p: LatLng, fromIndex = 1): PathSnap | null {
  if (path.length < 2) return null;
  // Flat projection around p: plenty accurate over a city.
  const kx = 111.32 * Math.cos(rad(p.latitude));
  const ky = 110.574;
  let best: PathSnap | null = null;
  let bestD2 = Infinity;
  for (let i = Math.max(1, Math.min(fromIndex, path.length - 1)); i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const ax = (a.longitude - p.longitude) * kx, ay = (a.latitude - p.latitude) * ky;
    const bx = (b.longitude - p.longitude) * kx, by = (b.latitude - p.latitude) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const qx = ax + t * dx, qy = ay + t * dy;
    const d2 = qx * qx + qy * qy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = { point: lerp(a, b, t), index: i, offsetKm: Math.sqrt(d2), heading: bearing(a, b) };
    }
  }
  return best;
}

/** The rest of a route from wherever `point` sits on it (for drawing what's left of a trip). */
export function trimPathFrom(path: LatLng[], point: LatLng): LatLng[] {
  const snap = snapToPath(path, point);
  if (!snap) return path;
  return [snap.point, ...path.slice(snap.index)];
}

/** Decodes a Google encoded polyline. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/** Rough service area around Sokoto city (Sokoto North/South and the airport). */
export const SOKOTO_AREA = { minLat: 12.85, maxLat: 13.15, minLng: 5.1, maxLng: 5.35 };
export const SOKOTO_CENTER: LatLng = { latitude: 13.0482, longitude: 5.231 };

export type Box = { minLat: number; maxLat: number; minLng: number; maxLng: number };
export type City = { id: string; name: string; state: string; center: LatLng; area: Box };

/** The cities Caliphate Rides works in (the same boxes as the backend's src/data/cities.js). */
export const CITIES: City[] = [
  { id: "sokoto", name: "Sokoto", state: "Sokoto", center: SOKOTO_CENTER, area: SOKOTO_AREA },
  { id: "kano", name: "Kano", state: "Kano", center: { latitude: 12.0022, longitude: 8.592 }, area: { minLat: 11.85, maxLat: 12.15, minLng: 8.35, maxLng: 8.75 } },
  { id: "kaduna", name: "Kaduna", state: "Kaduna", center: { latitude: 10.5105, longitude: 7.4165 }, area: { minLat: 10.35, maxLat: 10.7, minLng: 7.25, maxLng: 7.6 } },
  { id: "abuja", name: "Abuja", state: "FCT (Abuja)", center: { latitude: 9.0765, longitude: 7.3986 }, area: { minLat: 8.85, maxLat: 9.25, minLng: 7.0, maxLng: 7.65 } },
  { id: "jos", name: "Jos", state: "Plateau", center: { latitude: 9.8965, longitude: 8.8583 }, area: { minLat: 9.7, maxLat: 10.05, minLng: 8.7, maxLng: 9.05 } },
];

export const inBox = (p: LatLng, b: Box) => p.latitude >= b.minLat && p.latitude <= b.maxLat && p.longitude >= b.minLng && p.longitude <= b.maxLng;
