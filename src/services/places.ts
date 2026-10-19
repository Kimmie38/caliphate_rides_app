import * as Location from "expo-location";
import { ENV } from "../config/env";
import { landmarks } from "../data/landmarks";
import { inServiceArea, serviceBounds, serviceCenter } from "../lib/area";
import { haversineKm, type LatLng } from "../lib/geo";
import type { Place } from "../types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ']/g, "");

/** Our own popular places first, then OpenStreetMap search (Photon), then Google if a key is set. */
export async function searchPlaces(query: string, near: LatLng, signal?: AbortSignal): Promise<Place[]> {
  const q = norm(query.trim());
  const local = landmarks().filter((l) => !q || norm(`${l.name} ${l.subtitle ?? ""}`).includes(q))
    .map((l) => ({ place: l as Place, km: haversineKm(near, l.location), popular: l.popular }))
    .sort((a, b) => (q ? a.km - b.km : Number(b.popular) - Number(a.popular) || a.km - b.km))
    .map((r) => r.place);

  if (!q || q.length < 3) return local.slice(0, 15);

  const [osm, google] = await Promise.all([
    searchOsm(query, near, signal).catch(() => [] as Place[]),
    ENV.googleMapsKey ? searchGoogle(query, signal).catch(() => [] as Place[]) : Promise.resolve([] as Place[]),
  ]);
  // Drop results that repeat a place already listed (same name, or within 60 m of one).
  const out: Place[] = [...local.slice(0, 8)];
  for (const p of [...osm, ...google]) {
    const dup = out.some((o) => norm(o.name) === norm(p.name) ||
      (!p.googlePlaceId && !o.googlePlaceId && haversineKm(o.location, p.location) < 0.06));
    if (!dup) out.push(p);
  }
  return out.slice(0, 15);
}

/** Category for an OpenStreetMap tag value, so results get the same colours as our places. */
function osmCategory(key: string, value: string): Place["category"] {
  if (["marketplace", "supermarket", "convenience", "grocery"].includes(value)) return "market";
  if (["hospital", "clinic", "pharmacy", "doctors", "dentist"].includes(value)) return "health";
  if (["school", "university", "college", "kindergarten", "library"].includes(value)) return "school";
  if (value === "place_of_worship" || value === "mosque") return "mosque";
  if (["bus_station", "bus_stop", "fuel", "taxi", "parking"].includes(value)) return "transport";
  if (["townhall", "police", "courthouse", "government", "post_office", "fire_station"].includes(value) || key === "office") return "gov";
  if (["hotel", "guest_house", "hostel", "motel"].includes(value)) return "hotel";
  if (value === "aerodrome") return "airport";
  if (key === "shop" || value === "mall") return "shopping";
  return "search";
}

/** OpenStreetMap place search (Photon), limited to the service area. */
async function searchOsm(query: string, near: LatLng, signal?: AbortSignal): Promise<Place[]> {
  const [w, s, e, n] = serviceBounds();
  const url = `${ENV.searchUrl}/api/?q=${encodeURIComponent(query)}&lat=${near.latitude}&lon=${near.longitude}` +
    `&bbox=${w},${s},${e},${n}&limit=10&lang=en`;
  const json = await (await fetch(url, { signal })).json();
  return (json?.features ?? [])
    .filter((f: any) => f?.geometry?.type === "Point" && f.properties?.name)
    .map((f: any): Place => {
      const p = f.properties;
      const [lng, lat] = f.geometry.coordinates;
      const area = [p.street, p.district ?? p.locality, p.city ?? p.county].filter(Boolean);
      return {
        id: `osm:${p.osm_type ?? ""}${p.osm_id ?? `${lat},${lng}`}`,
        name: p.name,
        subtitle: [...new Set(area)].slice(0, 2).join(", ") || undefined,
        category: osmCategory(p.osm_key ?? "", p.osm_value ?? ""),
        location: { latitude: lat, longitude: lng },
      };
    })
    .filter((p: Place) => inServiceArea(p.location));
}

/** Optional: Google place search. Results need a details lookup for coordinates (resolvePlace). */
async function searchGoogle(query: string, signal?: AbortSignal): Promise<Place[]> {
  const c = serviceCenter();
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}` +
    `&components=country:ng&location=${c.latitude},${c.longitude}&radius=25000&strictbounds=true` +
    `&key=${ENV.googleMapsKey}`;
  const json = await (await fetch(url, { signal })).json();
  return (json.predictions ?? []).slice(0, 5).map((p: any) => ({
    id: `g:${p.place_id}`,
    name: p.structured_formatting?.main_text ?? p.description,
    subtitle: p.structured_formatting?.secondary_text,
    category: "search",
    location: { latitude: 0, longitude: 0 },
    googlePlaceId: p.place_id,
  }));
}

/** Looks up coordinates for a Google result. */
export async function resolvePlace(place: Place): Promise<Place> {
  if (!place.googlePlaceId) return place;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.googlePlaceId}&fields=geometry&key=${ENV.googleMapsKey}`;
  const json = await (await fetch(url)).json();
  const loc = json?.result?.geometry?.location;
  if (!loc) throw new Error("Couldn't find that place on the map. Try another search or drop a pin.");
  return { ...place, location: { latitude: loc.lat, longitude: loc.lng }, googlePlaceId: undefined };
}

/** Nearest popular place within `maxKm`, for labels like "Near Karaye Specialist Hospital". */
export function nearestLandmark(p: LatLng, maxKm = 1.2) {
  let best: ReturnType<typeof landmarks>[number] | null = null;
  let bestKm = Infinity;
  for (const l of landmarks()) {
    const km = haversineKm(p, l.location);
    if (km < bestKm) { best = l; bestKm = km; }
  }
  return best && bestKm <= maxKm ? { place: best, km: bestKm } : null;
}

/** A readable description of any point: a nearby landmark, else the street from the phone's geocoder. */
export async function describePoint(p: LatLng): Promise<string> {
  const near = nearestLandmark(p, 0.6);
  if (near) return near.km < 0.08 ? near.place.name : `Near ${near.place.name}`;
  try {
    const [r] = await Location.reverseGeocodeAsync(p);
    const parts = [r?.street ?? r?.name, r?.district ?? r?.subregion].filter(Boolean);
    if (parts.length) return parts.join(", ");
  } catch {
    // ignore
  }
  const wide = nearestLandmark(p, 3);
  return wide ? `Near ${wide.place.name}` : "Pinned location";
}
