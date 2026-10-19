import { SOKOTO_AREA, SOKOTO_CENTER, type LatLng } from "./geo";

// The service area (Sokoto), with an optional "try it where you are" shift for sample mode.
//
// When you test the app outside Sokoto in sample mode, the whole Sokoto layout (landmarks,
// service area, sample drivers) is moved so that central Sokoto sits on your real position.
// The places keep their names and their distances from each other, so fares look realistic.
// With real data (EXPO_PUBLIC_USE_MOCK=false) nothing is ever shifted.

let offset = { lat: 0, lng: 0 };

export function relocateTo(here: LatLng) {
  offset = { lat: here.latitude - SOKOTO_CENTER.latitude, lng: here.longitude - SOKOTO_CENTER.longitude };
}

export const isRelocated = () => offset.lat !== 0 || offset.lng !== 0;

/** Real Sokoto coordinates → where they're shown (unchanged unless relocated). */
export function shift(p: LatLng): LatLng {
  return { latitude: p.latitude + offset.lat, longitude: p.longitude + offset.lng };
}

function unshift(p: LatLng): LatLng {
  return { latitude: p.latitude - offset.lat, longitude: p.longitude - offset.lng };
}

/** Centre of the service area as currently shown. */
export const serviceCenter = (): LatLng => shift(SOKOTO_CENTER);

/** The service area's box (west, south, east, north), moved with the sample-mode shift. */
export function serviceBounds(): [number, number, number, number] {
  const sw = shift({ latitude: SOKOTO_AREA.minLat, longitude: SOKOTO_AREA.minLng });
  const ne = shift({ latitude: SOKOTO_AREA.maxLat, longitude: SOKOTO_AREA.maxLng });
  return [sw.longitude, sw.latitude, ne.longitude, ne.latitude];
}

export function inServiceArea(p: LatLng): boolean {
  const q = unshift(p);
  return (
    q.latitude >= SOKOTO_AREA.minLat && q.latitude <= SOKOTO_AREA.maxLat &&
    q.longitude >= SOKOTO_AREA.minLng && q.longitude <= SOKOTO_AREA.maxLng
  );
}
