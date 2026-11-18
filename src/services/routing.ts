import { ENV } from "../config/env";
import { haversineKm, type LatLng } from "../lib/geo";
import { fetchWithRetry } from "./http";

export type RouteResult = { path: LatLng[]; distanceKm: number; durationMin: number; source: "osrm" | "estimate" };

const CITY_KMH = 22; // average city speed used for estimates

/**
 * Road route between two points, from our routing server (OSRM on OpenStreetMap roads).
 * Falls back to a two-leg "city block" estimate if the server can't be reached.
 *
 * In production the backend computes this when it quotes a fare (POST /rides/quote), using the
 * same routing server, so riders and drivers always see the same distance and price.
 */
export async function getRoute(from: LatLng, to: LatLng): Promise<RouteResult> {
  const primary = await osrmRoute(ENV.routingUrl, from, to);
  if (primary) return primary;
  // Our server only knows Sokoto (and may be waking up): try the public one before estimating.
  if (ENV.routingFallbackUrl && ENV.routingFallbackUrl !== ENV.routingUrl) {
    const fallback = await osrmRoute(ENV.routingFallbackUrl, from, to);
    if (fallback) return fallback;
  }
  return estimateRoute(from, to);
}

async function osrmRoute(base: string, from: LatLng, to: LatLng): Promise<RouteResult | null> {
  try {
    const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${base}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const { response: res, text } = await fetchWithRetry(url);
    const json = text ? JSON.parse(text) : null;
    const route = json?.code === "Ok" ? json.routes?.[0] : null;
    const line: [number, number][] | undefined = route?.geometry?.coordinates;
    if (route && line && line.length >= 2) {
      return {
        path: line.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
        distanceKm: route.distance / 1000,
        durationMin: Math.max(1, Math.round(route.duration / 60)),
        source: "osrm",
      };
    }
  } catch {
    // offline or server down
  }
  return null;
}

/** Close to typical road distance in a grid-like city, for when routing is unavailable. */
export function estimateRoute(from: LatLng, to: LatLng): RouteResult {
  const corner = { latitude: from.latitude, longitude: to.longitude };
  const path = [from, corner, to];
  const distanceKm = haversineKm(from, corner) + haversineKm(corner, to);
  return { path, distanceKm, durationMin: Math.max(2, Math.round((distanceKm / CITY_KMH) * 60)), source: "estimate" };
}
