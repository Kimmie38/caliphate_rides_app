// Values come from .env (see .env.example). Expo inlines EXPO_PUBLIC_* at build time.
const bool = (v: string | undefined, fallback: boolean) => (v === undefined || v === "" ? fallback : v === "true");
const url = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback).replace(/\/$/, "");

export const ENV = {
  useMock: bool(process.env.EXPO_PUBLIC_USE_MOCK, true),
  /** Sample mode only: when you're outside Sokoto, move Sokoto's places around your real location. */
  demoAtMyLocation: bool(process.env.EXPO_PUBLIC_DEMO_AT_MY_LOCATION, true),
  apiUrl: url(process.env.EXPO_PUBLIC_API_URL, "http://localhost:4000"),
  /** Optional: Google place search alongside ours. Leave empty to use only our own map services. */
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  shareBaseUrl: url(process.env.EXPO_PUBLIC_SHARE_BASE_URL, "https://caliphaterides.ng/t"),

  // ---- Our map (see caliphate-map-server/README.md) ----
  // Defaults use free public servers so the app works straight away.
  // Point these at our own Sokoto map server before launch.
  /** Vector map tiles (TileJSON, OpenMapTiles layout). */
  mapTilesUrl: url(process.env.EXPO_PUBLIC_MAP_TILES_URL, "https://tiles.openfreemap.org/planet"),
  /** Map label fonts, with {fontstack} and {range}. */
  mapGlyphsUrl: url(process.env.EXPO_PUBLIC_MAP_GLYPHS_URL, "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf"),
  /** Road routing (OSRM). The public demo server is for testing only. */
  routingUrl: url(process.env.EXPO_PUBLIC_ROUTING_URL, "https://router.project-osrm.org"),
  /** Place search (Photon). The public server is for testing only. */
  searchUrl: url(process.env.EXPO_PUBLIC_SEARCH_URL, "https://photon.komoot.io"),
};
