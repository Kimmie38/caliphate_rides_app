import { landmarks } from "../../data/landmarks";
import { categoryTint } from "../../theme/tints";

/** Our Sokoto places as map data, each with its category colour. Used by both map engines. */
export function placesGeoJSON(isDark: boolean): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: landmarks().map((l) => ({
      type: "Feature",
      id: l.id,
      properties: { name: l.name, color: categoryTint(l.category, isDark).fg, popular: l.popular ? 1 : 0 },
      geometry: { type: "Point", coordinates: [l.location.longitude, l.location.latitude] },
    })),
  };
}
