import { ENV } from "../config/env";
import type { LatLng } from "../lib/geo";
import type { MapSources } from "./style";

/**
 * Where our own map server has streets: Sokoto State with a margin
 * (the BBOX the map server was built with, as west/south/east/north 3.9,11.4,7.0,14.0).
 */
export const OWN_MAP_AREA = { minLng: 3.9, minLat: 11.4, maxLng: 7.0, maxLat: 14.0 };

const OWN: MapSources = { tilesUrl: ENV.mapTilesUrl, glyphsUrl: ENV.mapGlyphsUrl };
const PUBLIC: MapSources = { tilesUrl: ENV.publicTilesUrl, glyphsUrl: ENV.publicGlyphsUrl };

/**
 * Which map to draw around `p`: our own Sokoto map, or the public map when `p` is outside
 * Sokoto State (testers in another city would otherwise see an empty map).
 */
export function mapSourcesFor(p: LatLng | undefined): MapSources {
  if (!p || OWN.tilesUrl === PUBLIC.tilesUrl) return OWN;
  const inside =
    p.latitude >= OWN_MAP_AREA.minLat && p.latitude <= OWN_MAP_AREA.maxLat &&
    p.longitude >= OWN_MAP_AREA.minLng && p.longitude <= OWN_MAP_AREA.maxLng;
  return inside ? OWN : PUBLIC;
}
