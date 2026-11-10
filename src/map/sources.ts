import { ENV } from "../config/env";
import type { LatLng } from "../lib/geo";
import type { MapSources } from "./style";

/**
 * Where our own map server has streets: Sokoto, Kano, Kaduna, FCT (Abuja) and Plateau, each with a
 * margin (the boxes in the map kit's regions.geojson).
 */
export const OWN_MAP_AREAS = [
  { minLng: 3.9, minLat: 11.4, maxLng: 7.0, maxLat: 14.0 }, // Sokoto
  { minLng: 7.6, minLat: 10.2, maxLng: 9.5, maxLat: 12.7 }, // Kano
  { minLng: 6.0, minLat: 8.95, maxLng: 8.9, maxLat: 11.35 }, // Kaduna
  { minLng: 6.7, minLat: 8.35, maxLng: 7.7, maxLat: 9.4 }, // FCT (Abuja)
  { minLng: 8.3, minLat: 8.2, maxLng: 10.7, maxLat: 10.5 }, // Plateau
];

const OWN: MapSources = { tilesUrl: ENV.mapTilesUrl, glyphsUrl: ENV.mapGlyphsUrl };
const PUBLIC: MapSources = { tilesUrl: ENV.publicTilesUrl, glyphsUrl: ENV.publicGlyphsUrl };

/**
 * Which map to draw around `p`: our own map, or the public map when `p` is outside our states
 * (testers elsewhere would otherwise see an empty map).
 */
export function mapSourcesFor(p: LatLng | undefined): MapSources {
  if (!p || OWN.tilesUrl === PUBLIC.tilesUrl) return OWN;
  const inside = OWN_MAP_AREAS.some((a) => p.latitude >= a.minLat && p.latitude <= a.maxLat && p.longitude >= a.minLng && p.longitude <= a.maxLng);
  return inside ? OWN : PUBLIC;
}
