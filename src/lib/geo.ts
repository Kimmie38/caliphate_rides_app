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

/** The rest of a route from the vertex nearest to `point` (for drawing what's left of a trip). */
export function trimPathFrom(path: LatLng[], point: LatLng): LatLng[] {
  if (path.length < 2) return path;
  let best = 0, bestKm = Infinity;
  for (let i = 0; i < path.length; i++) {
    const km = haversineKm(path[i], point);
    if (km < bestKm) { best = i; bestKm = km; }
  }
  // If the driver is past the nearest vertex, drop it so the line doesn't double back.
  const next = best < path.length - 1 && haversineKm(path[best + 1], point) < haversineKm(path[best + 1], path[best]) ? best + 1 : best;
  return [point, ...path.slice(next)];
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
