// Values come from .env (see .env.example). Expo inlines EXPO_PUBLIC_* at build time.
const bool = (v: string | undefined, fallback: boolean) => (v === undefined || v === "" ? fallback : v === "true");
const url = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback).replace(/\/$/, "");

const PUBLIC_TILES = "https://tiles.openfreemap.org/planet";
const PUBLIC_GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

export const ENV = {
  useMock: bool(process.env.EXPO_PUBLIC_USE_MOCK, true),
  /** Sample mode only: when you're outside Sokoto, move Sokoto's places around your real location. */
  demoAtMyLocation: bool(process.env.EXPO_PUBLIC_DEMO_AT_MY_LOCATION, true),
  apiUrl: url(process.env.EXPO_PUBLIC_API_URL, "https://api.caliphaterides.com.ng"),
  /**
   * With the backend: "anywhere" lets you ride and drive outside Sokoto while testing (the backend needs
   * SERVICE_AREA=anywhere too). Leave empty for real use: Sokoto only.
   */
  serviceAnywhere: !bool(process.env.EXPO_PUBLIC_USE_MOCK, true) && (process.env.EXPO_PUBLIC_SERVICE_AREA ?? "").trim().toLowerCase() === "anywhere",
  /** Optional: Google place search alongside ours. Leave empty to use only our own map services. */
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  shareBaseUrl: url(process.env.EXPO_PUBLIC_SHARE_BASE_URL, "https://caliphaterides.com.ng/t"),

  // ---- Our map (see caliphate-map-server/README.md) ----
  // Defaults use free public servers so the app works straight away.
  // Point these at our own Sokoto map server before launch.
  /** Vector map tiles (TileJSON, OpenMapTiles layout). Our own server only has Sokoto State. */
  mapTilesUrl: url(process.env.EXPO_PUBLIC_MAP_TILES_URL, PUBLIC_TILES),
  /** Map label fonts, with {fontstack} and {range}. */
  mapGlyphsUrl: url(process.env.EXPO_PUBLIC_MAP_GLYPHS_URL, PUBLIC_GLYPHS),
  /** The public map (OpenFreeMap), used away from Sokoto where our own map has no streets. */
  publicTilesUrl: PUBLIC_TILES,
  publicGlyphsUrl: PUBLIC_GLYPHS,
  /** Road routing (OSRM). The public demo server is for testing only. */
  routingUrl: url(process.env.EXPO_PUBLIC_ROUTING_URL, "https://router.project-osrm.org"),
  /** Tried when routingUrl can't route a trip (outside Sokoto, or still waking up). */
  routingFallbackUrl: url(process.env.EXPO_PUBLIC_ROUTING_FALLBACK_URL, "https://router.project-osrm.org"),
  /** Place search (Photon). The public server is for testing only. */
  searchUrl: url(process.env.EXPO_PUBLIC_SEARCH_URL, "https://photon.komoot.io"),
};
