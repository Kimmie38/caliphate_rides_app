import type {
  ExpressionSpecification as Expr,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "@maplibre/maplibre-gl-style-spec";
import type { Palette } from "../theme/tokens";

/**
 * The Caliphate Rides map: OpenStreetMap data drawn in our own white-and-green style.
 *
 * Map data comes as vector tiles in the OpenMapTiles layout. By default they come from
 * OpenFreeMap (free, no key). Our own Sokoto map server (caliphate-map-server/)
 * serves the same layout, so switching is just a different `tilesUrl`.
 *
 * Built in code rather than a JSON file so it follows the app's colour tokens in light and dark.
 */

export type MapSources = {
  /** TileJSON URL of an OpenMapTiles-layout vector tile source. */
  tilesUrl: string;
  /** Glyph (font) URL template with {fontstack} and {range}. */
  glyphsUrl: string;
};

/** Colours for the base map, derived from the app palette. */
type MapColors = {
  land: string; residential: string; park: string; wood: string; sand: string;
  water: string; waterLine: string; building: string; buildingLine: string;
  hospital: string; school: string; airport: string; runway: string;
  roadMinor: string; roadMajor: string; roadTrunk: string;
  casing: string; casingMajor: string; casingTrunk: string;
  path: string; rail: string; boundary: string;
  label: string; labelStrong: string; labelHalo: string; water_label: string;
};

function mapColors(c: Palette, isDark: boolean): MapColors {
  return isDark
    ? {
        land: "#0C1611", residential: "#101C16", park: "#122A1D", wood: "#112A1C", sand: "#18170F",
        water: "#0D2B35", waterLine: "#123A47", building: "#16241D", buildingLine: "#1D2D25",
        hospital: "#22161A", school: "#141C2A", airport: "#121D18", runway: "#1F2C25",
        roadMinor: "#1D2B24", roadMajor: "#26392F", roadTrunk: "#3B3520",
        casing: "#08100C", casingMajor: "#08100C", casingTrunk: "#141109",
        path: "#2A3A31", rail: "#2B3A32", boundary: "#3C5246",
        label: c.muted, labelStrong: c.ink, labelHalo: "#0C1611", water_label: "#5FA6BC",
      }
    : {
        land: "#EEF2EF", residential: "#E8EDE9", park: "#D8EEDF", wood: "#CDE8D5", sand: "#F2EEE2",
        water: "#C6E1EA", waterLine: "#AFD3DF", building: "#E0E6E2", buildingLine: "#D2DBD5",
        hospital: "#FBE9E8", school: "#EAF0FB", airport: "#E7ECE9", runway: "#D9E1DC",
        roadMinor: "#FFFFFF", roadMajor: "#FFFFFF", roadTrunk: "#FFF4D6",
        casing: "#D6DFD9", casingMajor: "#C5D2C9", casingTrunk: "#E5CF95",
        path: "#C9D4CD", rail: "#C0CBC4", boundary: "#A9B9AE",
        label: c.muted, labelStrong: c.ink, labelHalo: "#FFFFFF", water_label: "#3F87A0",
      };
}

/** Place categories on the map, in the same colours as the app's place badges. */
const POI_GROUPS: { tint: string; classes: string[] }[] = [
  { tint: "mosque", classes: ["place_of_worship"] },
  { tint: "market", classes: ["shop", "grocery", "marketplace", "convenience", "bakery"] },
  { tint: "health", classes: ["hospital", "pharmacy", "clinic", "doctors", "dentist"] },
  { tint: "school", classes: ["school", "college", "university", "kindergarten", "library"] },
  { tint: "transport", classes: ["bus", "fuel", "parking", "car", "railway"] },
  { tint: "gov", classes: ["town_hall", "police", "post", "fire_station", "embassy"] },
  { tint: "hotel", classes: ["lodging"] },
  { tint: "shopping", classes: ["clothing_store", "mobile_phone", "electronics"] },
  { tint: "green", classes: ["park", "stadium", "pitch", "garden"] },
];

type TintColors = Record<string, { bg: string; fg: string }>;

/** Omit that keeps each member of a union (so every layer type keeps its own paint and layout). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// ---------- expression helpers ----------

/** Smoothly widen lines with zoom. stops: [zoom, width, zoom, width, …] */
const widen = (...stops: number[]): Expr => ["interpolate", ["exponential", 1.45], ["zoom"], ...stops] as Expr;
const isLine: Expr = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];
const isArea: Expr = ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false];
const notTunnel: Expr = ["!=", ["get", "brunnel"], "tunnel"];
const classIn = (...classes: string[]): Expr => ["match", ["get", "class"], classes, true, false];
const name: Expr = ["coalesce", ["get", "name:latin"], ["get", "name"]];

const REGULAR = ["Noto Sans Regular"];
const BOLD = ["Noto Sans Bold"];

/** Road classes from smallest to largest, each with its widths (fill) and casing extra. */
const ROADS: { id: string; classes: string[]; fill: keyof MapColors; casing: keyof MapColors; width: number[]; minzoom: number }[] = [
  { id: "service", classes: ["service", "track"], fill: "roadMinor", casing: "casing", width: [13, 0.5, 15, 2, 18, 8], minzoom: 13 },
  { id: "minor", classes: ["minor", "street", "street_limited"], fill: "roadMinor", casing: "casing", width: [11, 0.4, 13, 1.2, 15, 4, 18, 15], minzoom: 11 },
  { id: "tertiary", classes: ["tertiary"], fill: "roadMajor", casing: "casingMajor", width: [9, 0.5, 12, 1.6, 15, 6, 18, 20], minzoom: 9 },
  { id: "secondary", classes: ["secondary"], fill: "roadMajor", casing: "casingMajor", width: [8, 0.6, 12, 2, 15, 7, 18, 22], minzoom: 8 },
  { id: "primary", classes: ["primary"], fill: "roadMajor", casing: "casingMajor", width: [7, 0.7, 12, 2.6, 15, 8.5, 18, 26], minzoom: 7 },
  { id: "trunk", classes: ["trunk", "motorway"], fill: "roadTrunk", casing: "casingTrunk", width: [5, 0.8, 12, 3, 15, 10, 18, 30], minzoom: 5 },
];

/** Adds `extra` px of casing on each side to a width ramp. */
const withCasing = (width: number[], extra: number) =>
  width.map((v, i) => (i % 2 === 1 ? v + (width[i - 1] >= 14 ? extra * 2 : extra) : v));

/** The map's ground colour, shown while the map loads so there's no white flash. */
export function mapGroundColor(palette: Palette, isDark: boolean): string {
  return mapColors(palette, isDark).land;
}

export function buildMapStyle(palette: Palette, tints: TintColors, isDark: boolean, src: MapSources): StyleSpecification {
  const m = mapColors(palette, isDark);
  const layers: LayerSpecification[] = [];
  const omt = (layer: DistributiveOmit<Exclude<LayerSpecification, { type: "background" }>, "source">) => layers.push({ ...layer, source: "openmaptiles" } as LayerSpecification);

  // ---------- ground ----------
  layers.push({ id: "background", type: "background", paint: { "background-color": m.land } });
  omt({ id: "landuse-residential", type: "fill", "source-layer": "landuse", filter: classIn("residential", "suburb", "neighbourhood"), paint: { "fill-color": m.residential } });
  omt({ id: "landcover-sand", type: "fill", "source-layer": "landcover", filter: classIn("sand"), paint: { "fill-color": m.sand } });
  omt({ id: "landcover-wood", type: "fill", "source-layer": "landcover", filter: classIn("wood", "forest"), paint: { "fill-color": m.wood, "fill-opacity": 0.8 } });
  omt({ id: "landcover-grass", type: "fill", "source-layer": "landcover", filter: classIn("grass", "farmland", "wetland"), paint: { "fill-color": m.park, "fill-opacity": 0.55 } });
  omt({ id: "park", type: "fill", "source-layer": "park", filter: isArea, paint: { "fill-color": m.park } });
  omt({ id: "landuse-hospital", type: "fill", "source-layer": "landuse", filter: classIn("hospital"), paint: { "fill-color": m.hospital } });
  omt({ id: "landuse-school", type: "fill", "source-layer": "landuse", filter: classIn("school", "university", "college", "kindergarten"), paint: { "fill-color": m.school } });
  omt({ id: "landuse-pitch", type: "fill", "source-layer": "landuse", filter: classIn("pitch", "stadium", "playground"), paint: { "fill-color": m.park } });

  // ---------- water ----------
  omt({ id: "water", type: "fill", "source-layer": "water", filter: ["all", isArea, notTunnel], paint: { "fill-color": m.water } });
  omt({
    id: "waterway", type: "line", "source-layer": "waterway", filter: ["all", isLine, notTunnel],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": m.waterLine, "line-width": ["interpolate", ["linear"], ["zoom"], 9, ["match", ["get", "class"], "river", 1.2, 0.4], 16, ["match", ["get", "class"], "river", 6, 2]] },
  });

  // ---------- airport ----------
  omt({ id: "aeroway-area", type: "fill", "source-layer": "aeroway", minzoom: 11, filter: isArea, paint: { "fill-color": m.airport } });
  omt({ id: "aeroway-runway", type: "line", "source-layer": "aeroway", minzoom: 11, filter: ["all", isLine, classIn("runway", "taxiway")],
    paint: { "line-color": m.runway, "line-width": widen(11, 2, 14, 10, 17, 50) } });

  // ---------- buildings ----------
  omt({ id: "building", type: "fill", "source-layer": "building", minzoom: 14,
    paint: { "fill-color": m.building, "fill-outline-color": m.buildingLine, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 1] } });

  // ---------- roads: casings (smallest first), then fills ----------
  omt({ id: "road-path", type: "line", "source-layer": "transportation", minzoom: 14, filter: ["all", isLine, classIn("path", "pedestrian")],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": m.path, "line-width": widen(14, 0.8, 18, 3), "line-dasharray": [1.5, 1.2] } });
  for (const r of ROADS) {
    omt({
      id: `road-${r.id}-casing`, type: "line", "source-layer": "transportation", minzoom: Math.max(r.minzoom, 11),
      filter: ["all", isLine, notTunnel, classIn(...r.classes)],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m[r.casing], "line-width": widen(...withCasing(r.width, 1.2)) },
    });
  }
  for (const r of ROADS) {
    omt({
      id: `road-${r.id}`, type: "line", "source-layer": "transportation", minzoom: r.minzoom,
      filter: ["all", isLine, notTunnel, classIn(...r.classes)],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": m[r.fill], "line-width": widen(...r.width) },
    });
  }
  omt({ id: "rail", type: "line", "source-layer": "transportation", minzoom: 10, filter: ["all", isLine, classIn("rail", "transit")],
    paint: { "line-color": m.rail, "line-width": widen(10, 0.6, 16, 2), "line-dasharray": [3, 2] } });

  // ---------- boundaries ----------
  omt({ id: "boundary-state", type: "line", "source-layer": "boundary", filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
    paint: { "line-color": m.boundary, "line-width": 1.2, "line-dasharray": [3, 2] } });

  // ---------- labels ----------
  omt({
    id: "water-name-line", type: "symbol", "source-layer": "water_name", minzoom: 12, filter: isLine,
    layout: { "text-field": name, "text-font": REGULAR, "text-size": 12, "symbol-placement": "line" },
    paint: { "text-color": m.water_label, "text-halo-color": m.labelHalo, "text-halo-width": 1.2 },
  });
  omt({
    id: "water-name-point", type: "symbol", "source-layer": "water_name", minzoom: 11, filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
    layout: { "text-field": name, "text-font": REGULAR, "text-size": 12, "text-max-width": 8 },
    paint: { "text-color": m.water_label, "text-halo-color": m.labelHalo, "text-halo-width": 1.2 },
  });
  omt({
    id: "road-name", type: "symbol", "source-layer": "transportation_name", minzoom: 14,
    filter: ["all", isLine, classIn("motorway", "trunk", "primary", "secondary", "tertiary", "minor", "street")],
    layout: {
      "symbol-placement": "line", "text-field": name, "text-font": REGULAR,
      "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10.5, 18, 13.5], "text-max-angle": 30, "symbol-spacing": 320,
    },
    paint: { "text-color": m.label, "text-halo-color": m.labelHalo, "text-halo-width": 1.6 },
  });

  // Places on the map, coloured by category like the app's place badges.
  const poiColor: Expr = ["match", ["get", "class"],
    ...POI_GROUPS.flatMap((g) => [g.classes, tints[g.tint]?.fg ?? m.label]),
    m.label,
  ] as unknown as Expr;
  const poiFilter = (maxRank: number): FilterSpecification => ["all",
    ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
    ["has", "name"],
    ["<=", ["coalesce", ["get", "rank"], 99], maxRank],
    ["match", ["get", "class"], POI_GROUPS.flatMap((g) => g.classes), true, false],
  ];
  for (const [id, minzoom, maxzoom, maxRank] of [["poi-major", 14, 16, 12], ["poi-all", 16, 24, 99]] as const) {
    omt({
      id: `${id}-dot`, type: "circle", "source-layer": "poi", minzoom, maxzoom, filter: poiFilter(maxRank),
      paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 3.5, 18, 5.5], "circle-color": poiColor, "circle-stroke-color": m.labelHalo, "circle-stroke-width": 1.5 },
    });
    omt({
      id: `${id}-label`, type: "symbol", "source-layer": "poi", minzoom, maxzoom, filter: poiFilter(maxRank),
      layout: {
        "text-field": name, "text-font": REGULAR, "text-size": 11.5, "text-max-width": 8,
        "text-variable-anchor": ["left", "right", "top"], "text-radial-offset": 0.7, "text-justify": "auto", "text-optional": true,
      },
      paint: { "text-color": poiColor, "text-halo-color": m.labelHalo, "text-halo-width": 1.4 },
    });
  }

  omt({
    id: "place-neighbourhood", type: "symbol", "source-layer": "place", minzoom: 13,
    filter: classIn("neighbourhood", "quarter", "hamlet", "isolated_dwelling"),
    layout: { "text-field": name, "text-font": BOLD, "text-size": 11, "text-transform": "uppercase", "text-letter-spacing": 0.12, "text-max-width": 7 },
    paint: { "text-color": m.label, "text-halo-color": m.labelHalo, "text-halo-width": 1.4 },
  });
  omt({
    id: "place-suburb", type: "symbol", "source-layer": "place", minzoom: 11,
    filter: classIn("suburb", "village"),
    layout: { "text-field": name, "text-font": BOLD, "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 15, 13.5], "text-transform": "uppercase", "text-letter-spacing": 0.1, "text-max-width": 8 },
    paint: { "text-color": m.label, "text-halo-color": m.labelHalo, "text-halo-width": 1.6 },
  });
  omt({
    id: "place-town", type: "symbol", "source-layer": "place", minzoom: 6, maxzoom: 15,
    filter: classIn("city", "town"),
    layout: { "text-field": name, "text-font": BOLD, "text-size": ["interpolate", ["linear"], ["zoom"], 6, 12, 12, 18], "text-max-width": 8 },
    paint: { "text-color": m.labelStrong, "text-halo-color": m.labelHalo, "text-halo-width": 2 },
  });

  return {
    version: 8,
    name: isDark ? "Caliphate Rides Night" : "Caliphate Rides Day",
    sources: {
      openmaptiles: {
        type: "vector",
        url: src.tilesUrl,
        attribution: "© OpenStreetMap contributors",
      },
    },
    glyphs: src.glyphsUrl,
    layers,
  };
}
