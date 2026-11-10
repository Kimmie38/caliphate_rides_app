import { ENV } from "../config/env";
import { currentLang } from "../i18n";
import { CITIES, haversineKm, inBox, SOKOTO_CENTER, type City, type LatLng } from "./geo";

// The service area: the cities in CITIES (Sokoto, Kano, Kaduna, Abuja, Jos).
// "The current city" is the one the person is in (or nearest to); the map, search and popular places
// follow it. Sample mode can also shift the whole Sokoto layout onto your position ("try it anywhere").
//
// When you test the app outside our cities in sample mode, the Sokoto layout (landmarks, service
// area, sample drivers) is moved so that central Sokoto sits on your real position. The places keep
// their names and distances from each other, so fares look realistic. With real data
// (EXPO_PUBLIC_USE_MOCK=false) nothing is ever shifted.

let offset = { lat: 0, lng: 0 };
let current: City = CITIES[0];

export function relocateTo(here: LatLng) {
  current = CITIES[0];
  offset = { lat: here.latitude - SOKOTO_CENTER.latitude, lng: here.longitude - SOKOTO_CENTER.longitude };
}

export const isRelocated = () => offset.lat !== 0 || offset.lng !== 0;

/** Real coordinates → where they're shown (unchanged unless relocated). */
export function shift(p: LatLng): LatLng {
  return { latitude: p.latitude + offset.lat, longitude: p.longitude + offset.lng };
}

function unshift(p: LatLng): LatLng {
  return { latitude: p.latitude - offset.lat, longitude: p.longitude - offset.lng };
}

/** The city a point is in, or null. */
export function cityAt(p: LatLng): City | null {
  const q = unshift(p);
  return CITIES.find((c) => inBox(q, c.area)) ?? null;
}

/** The city nearest a point (for someone just outside, or a pin on the edge). */
export function nearestCity(p: LatLng): City {
  const q = unshift(p);
  return CITIES.reduce((best, c) => (haversineKm(q, c.center) < haversineKm(q, best.center) ? c : best), CITIES[0]);
}

/** Remembers which city the person is in, so the map and search open there. */
export function noteLocation(p: LatLng) {
  if (isRelocated()) return;
  current = cityAt(p) ?? nearestCity(p);
}

export const currentCity = (): City => current;

/** Centre of the current city as shown. */
export const serviceCenter = (): LatLng => shift(current.center);

/** The current city's box (west, south, east, north), moved with the sample-mode shift. */
export function serviceBounds(): [number, number, number, number] {
  const a = current.area;
  const sw = shift({ latitude: a.minLat, longitude: a.minLng });
  const ne = shift({ latitude: a.maxLat, longitude: a.maxLng });
  return [sw.longitude, sw.latitude, ne.longitude, ne.latitude];
}

/** Inside any of our cities. */
export function inServiceArea(p: LatLng): boolean {
  if (ENV.serviceAnywhere) return true; // testing in another city with the backend
  return cityAt(p) !== null;
}

/** "Sokoto, Kano, Kaduna, Abuja and Jos" */
export function cityNames(): string {
  const n = CITIES.map((c) => c.name);
  return `${n.slice(0, -1).join(", ")} ${currentLang() === "ha" ? "da" : "and"} ${n[n.length - 1]}`;
}
